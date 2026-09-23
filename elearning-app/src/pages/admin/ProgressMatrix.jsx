import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton } from '../../components/Toast';
import './AdminDashboard.css';
import './ProgressMatrix.css';

/* Trae todas las filas de una tabla paginando de a 1000 (límite por defecto de Supabase). */
async function fetchAllRows(build) {
    const PAGE = 1000;
    let from = 0;
    const out = [];
    for (; ;) {
        const { data, error } = await build().range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return out;
}

const key = (userId, lessonId) => `${userId}::${lessonId}`;

export default function ProgressMatrix() {
    const supabase = useSupabase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);

    const [students, setStudents] = useState([]);
    const [modules, setModules] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [progressMap, setProgressMap] = useState(new Map());
    const [assignmentMap, setAssignmentMap] = useState(new Map());
    const [quizLessonIds, setQuizLessonIds] = useState(new Set());
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                setError(false);

                const [profilesRes, modulesRes, lessonsRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .eq('status', 'approved')
                        .neq('role', 'admin')
                        .order('full_name', { ascending: true }),
                    supabase
                        .from('modules')
                        .select('id, title, module_number')
                        .eq('is_active', true)
                        .order('module_number', { ascending: true }),
                    supabase
                        .from('lessons')
                        .select('id, module_id, lesson_number, title, task_description, video_url, youtube_video_id')
                        .order('lesson_number', { ascending: true })
                ]);

                if (profilesRes.error) throw profilesRes.error;
                if (modulesRes.error) throw modulesRes.error;
                if (lessonsRes.error) throw lessonsRes.error;

                const [progressRows, assignmentRows, questionRows] = await Promise.all([
                    fetchAllRows(() => supabase
                        .from('lesson_progress')
                        .select('user_id, lesson_id, video_completed, quiz_completed, assignment_submitted, via_attendance')),
                    fetchAllRows(() => supabase
                        .from('assignments')
                        .select('user_id, lesson_id, status')),
                    fetchAllRows(() => supabase
                        .from('quiz_questions')
                        .select('lesson_id'))
                ]);

                if (!isMounted) return;

                const pMap = new Map();
                progressRows.forEach(r => pMap.set(key(r.user_id, r.lesson_id), r));

                const aMap = new Map();
                assignmentRows.forEach(r => aMap.set(key(r.user_id, r.lesson_id), r));

                setStudents(profilesRes.data || []);
                setModules(modulesRes.data || []);
                setLessons(lessonsRes.data || []);
                setProgressMap(pMap);
                setAssignmentMap(aMap);
                setQuizLessonIds(new Set(questionRows.map(q => q.lesson_id)));
                setSelectedStudentId(prev => prev || (profilesRes.data?.[0]?.id ?? ''));
            } catch (err) {
                console.error('Error cargando la matriz de progreso:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => { isMounted = false; };
    }, [supabase, reloadToken]);

    /* Lecciones agrupadas por módulo activo, en orden */
    const groups = useMemo(() => {
        return modules
            .map(m => ({
                module: m,
                lessons: lessons
                    .filter(l => l.module_id === m.id)
                    .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0))
            }))
            .filter(g => g.lessons.length > 0);
    }, [modules, lessons]);

    const orderedLessons = useMemo(
        () => groups.flatMap(g => g.lessons),
        [groups]
    );

    /* Qué se le exige a cada lección (no todas tienen video, quiz o tarea) */
    const requirements = useMemo(() => {
        const map = new Map();
        orderedLessons.forEach(l => {
            map.set(l.id, {
                video: Boolean(l.youtube_video_id || l.video_url),
                quiz: quizLessonIds.has(l.id),
                task: Boolean(l.task_description && l.task_description.trim())
            });
        });
        return map;
    }, [orderedLessons, quizLessonIds]);

    /* Una fila por alumno: estado de cada celda + % de avance */
    const rows = useMemo(() => {
        return students.map(student => {
            let done = 0;
            let total = 0;

            const cells = orderedLessons.map(lesson => {
                const req = requirements.get(lesson.id) || { video: false, quiz: false, task: false };
                const prog = progressMap.get(key(student.id, lesson.id));
                const asg = assignmentMap.get(key(student.id, lesson.id));

                const video = !req.video ? 'na' : (prog?.video_completed ? 'done' : 'todo');
                const videoPresent = video === 'done' && Boolean(prog?.via_attendance);
                const quiz = !req.quiz ? 'na' : (prog?.quiz_completed ? 'done' : 'todo');
                let task = 'na';
                if (req.task) {
                    if (asg?.status === 'graded') task = 'done';
                    else if (asg?.status === 'submitted' || prog?.assignment_submitted) task = 'partial';
                    else task = 'todo';
                }

                [video, quiz, task].forEach(state => {
                    if (state === 'na') return;
                    total += 1;
                    if (state === 'done') done += 1;
                });

                return { lessonId: lesson.id, video, videoPresent, quiz, task };
            });

            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            return { student, cells, percent, done, total };
        }).sort((a, b) => a.percent - b.percent || (a.student.full_name || '').localeCompare(b.student.full_name || ''));
    }, [students, orderedLessons, requirements, progressMap, assignmentMap]);

    const selectedRow = useMemo(
        () => rows.find(r => r.student.id === selectedStudentId) || rows[0] || null,
        [rows, selectedStudentId]
    );

    const lessonById = useMemo(() => {
        const map = new Map();
        orderedLessons.forEach(l => map.set(l.id, l));
        return map;
    }, [orderedLessons]);

    if (loading) {
        return (
            <div className="pm-page">
                <h1 className="admin-page-title">Matriz de progreso</h1>
                <div className="pm-card">
                    <Skeleton height={22} width="40%" style={{ marginBottom: 20 }} />
                    <Skeleton lines={8} height={18} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pm-page">
                <h1 className="admin-page-title">Matriz de progreso</h1>
                <div className="admin-error-banner">
                    <span>No pudimos cargar el progreso de los alumnos.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (rows.length === 0 || orderedLessons.length === 0) {
        return (
            <div className="pm-page">
                <h1 className="admin-page-title">Matriz de progreso</h1>
                <div className="admin-empty-state">
                    {rows.length === 0
                        ? 'Todavía no hay alumnos aprobados para seguir. Aprobá alumnos desde Usuarios y vuelvan a mirar acá.'
                        : 'Todavía no hay módulos activos con lecciones cargadas.'}
                </div>
            </div>
        );
    }

    return (
        <div className="pm-page">
            <div className="pm-header">
                <div>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>Matriz de progreso</h1>
                    <p className="pm-subtitle">
                        Los alumnos que van más atrás aparecen primero. Cada celda muestra video, quiz y tarea.
                        Estar presente en la clase cuenta como video visto.
                    </p>
                </div>
                <div className="pm-legend">
                    <span><i className="pm-dot pm-dot--done" /> Hecho</span>
                    <span><i className="pm-dot pm-dot--present" /> Presente en clase</span>
                    <span><i className="pm-dot pm-dot--partial" /> Entregado sin corregir</span>
                    <span><i className="pm-dot pm-dot--todo" /> Pendiente</span>
                    <span><i className="pm-dot pm-dot--na" /> No aplica</span>
                </div>
            </div>

            {/* ── Vista escritorio: matriz ── */}
            <div className="pm-desktop">
                <div className="pm-table-wrap">
                    <table className="pm-table">
                        <thead>
                            <tr>
                                <th className="pm-sticky pm-th-student" rowSpan={2}>Alumno</th>
                                <th className="pm-th-progress" rowSpan={2}>Avance</th>
                                {groups.map(g => (
                                    <th key={g.module.id} className="pm-th-module" colSpan={g.lessons.length}>
                                        M{g.module.module_number} · {g.module.title}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {orderedLessons.map(l => (
                                    <th key={l.id} className="pm-th-lesson" title={l.title}>
                                        {l.lesson_number}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.student.id}>
                                    <td className="pm-sticky pm-td-student">
                                        <Link to={`/admin/students/${row.student.id}`} className="pm-student-link">
                                            {row.student.full_name || 'Sin nombre'}
                                        </Link>
                                    </td>
                                    <td className="pm-td-progress">
                                        <div className="pm-bar">
                                            <div
                                                className={`pm-bar-fill ${row.percent < 34 ? 'is-low' : row.percent < 67 ? 'is-mid' : 'is-high'}`}
                                                style={{ width: `${row.percent}%` }}
                                            />
                                        </div>
                                        <span className="pm-bar-label">{row.percent}%</span>
                                    </td>
                                    {row.cells.map(cell => {
                                        const lesson = lessonById.get(cell.lessonId);
                                        return (
                                            <td key={cell.lessonId} className="pm-td-cell">
                                                <div
                                                    className="pm-cell"
                                                    title={`${lesson?.title || 'Lección'} — video: ${cell.videoPresent ? 'presente en clase' : labelOf(cell.video)}, quiz: ${labelOf(cell.quiz)}, tarea: ${labelOf(cell.task)}`}
                                                >
                                                    <i className={`pm-tick pm-tick--${cell.video}${cell.videoPresent ? ' pm-tick--present' : ''}`} />
                                                    <i className={`pm-tick pm-tick--${cell.quiz}`} />
                                                    <i className={`pm-tick pm-tick--${cell.task}`} />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Vista móvil: un alumno por vez ── */}
            <div className="pm-mobile">
                <label className="pm-select-label" htmlFor="pm-student-select">Ver el avance de</label>
                <select
                    id="pm-student-select"
                    className="pm-select"
                    value={selectedRow?.student.id || ''}
                    onChange={e => setSelectedStudentId(e.target.value)}
                >
                    {rows.map(r => (
                        <option key={r.student.id} value={r.student.id}>
                            {r.student.full_name || 'Sin nombre'} — {r.percent}%
                        </option>
                    ))}
                </select>

                {selectedRow && (
                    <>
                        <div className="pm-mobile-summary">
                            <div className="pm-bar">
                                <div
                                    className={`pm-bar-fill ${selectedRow.percent < 34 ? 'is-low' : selectedRow.percent < 67 ? 'is-mid' : 'is-high'}`}
                                    style={{ width: `${selectedRow.percent}%` }}
                                />
                            </div>
                            <span className="pm-bar-label">
                                {selectedRow.percent}% · {selectedRow.done} de {selectedRow.total} pasos
                            </span>
                            <Link to={`/admin/students/${selectedRow.student.id}`} className="admin-link-btn">
                                Ver perfil completo →
                            </Link>
                        </div>

                        {groups.map(g => (
                            <div key={g.module.id} className="pm-mobile-module">
                                <h3 className="pm-mobile-module-title">
                                    M{g.module.module_number} · {g.module.title}
                                </h3>
                                {g.lessons.map(lesson => {
                                    const cell = selectedRow.cells.find(c => c.lessonId === lesson.id);
                                    if (!cell) return null;
                                    return (
                                        <div key={lesson.id} className="pm-mobile-lesson">
                                            <span className="pm-mobile-lesson-title">
                                                <strong>{lesson.lesson_number}.</strong> {lesson.title}
                                            </span>
                                            <div className="pm-mobile-chips">
                                                <span className={`pm-chip pm-chip--${cell.video}${cell.videoPresent ? ' pm-chip--present' : ''}`}>
                                                    {cell.videoPresent ? 'Presente' : 'Video'}
                                                </span>
                                                <span className={`pm-chip pm-chip--${cell.quiz}`}>Quiz</span>
                                                <span className={`pm-chip pm-chip--${cell.task}`}>Tarea</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

function labelOf(state) {
    if (state === 'done') return 'hecho';
    if (state === 'partial') return 'entregado sin corregir';
    if (state === 'todo') return 'pendiente';
    return 'no aplica';
}
