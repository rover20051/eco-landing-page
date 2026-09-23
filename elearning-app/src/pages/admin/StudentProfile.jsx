import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton } from '../../components/Toast';
import './AdminDashboard.css';
import './StudentProfile.css';

const ATT_LABEL = { present: 'Presente', absent: 'Ausente', excused: 'Justificada' };

function formatDate(value) {
    if (!value) return '';
    const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function sortValue(value) {
    if (!value) return 0;
    const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function StudentProfile() {
    const supabase = useSupabase();
    const { userId } = useParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);

    const [student, setStudent] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [progress, setProgress] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [quizLessonIds, setQuizLessonIds] = useState(new Set());

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                setError(false);
                setNotFound(false);

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, status, created_at')
                    .eq('id', userId)
                    .maybeSingle();

                if (profileError) throw profileError;
                if (!profileData) {
                    if (isMounted) { setNotFound(true); setLoading(false); }
                    return;
                }

                const [lessonsRes, progressRes, assignmentsRes, attendanceRes, attemptsRes, questionsRes] = await Promise.all([
                    supabase
                        .from('lessons')
                        .select('id, title, lesson_number, task_description, video_url, youtube_video_id, modules(id, title, module_number, is_active)')
                        .order('lesson_number', { ascending: true }),
                    supabase
                        .from('lesson_progress')
                        .select('lesson_id, video_completed, quiz_completed, assignment_submitted, completed_at, via_attendance')
                        .eq('user_id', userId),
                    supabase
                        .from('assignments')
                        .select('id, lesson_id, status, grade, feedback, submitted_at, graded_at')
                        .eq('user_id', userId),
                    supabase
                        .from('attendance')
                        .select('event_date, status, notes')
                        .eq('user_id', userId)
                        .order('event_date', { ascending: false }),
                    supabase
                        .from('quiz_attempts')
                        .select('id, lesson_id, score, max_score, completed_at')
                        .eq('user_id', userId),
                    supabase
                        .from('quiz_questions')
                        .select('lesson_id')
                ]);

                const firstError = [lessonsRes, progressRes, assignmentsRes, attendanceRes, attemptsRes, questionsRes]
                    .map(r => r.error).find(Boolean);
                if (firstError) throw firstError;

                if (!isMounted) return;

                setStudent(profileData);
                setLessons(lessonsRes.data || []);
                setProgress(progressRes.data || []);
                setAssignments(assignmentsRes.data || []);
                setAttendance(attendanceRes.data || []);
                setAttempts(attemptsRes.data || []);
                setQuizLessonIds(new Set((questionsRes.data || []).map(q => q.lesson_id)));
            } catch (err) {
                console.error('Error cargando el perfil del alumno:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (userId) load();
        return () => { isMounted = false; };
    }, [supabase, userId, reloadToken]);

    const activeLessons = useMemo(
        () => lessons.filter(l => l.modules?.is_active !== false),
        [lessons]
    );

    const lessonById = useMemo(() => {
        const map = new Map();
        lessons.forEach(l => map.set(l.id, l));
        return map;
    }, [lessons]);

    const lessonLabel = useCallback((lessonId) => {
        const l = lessonById.get(lessonId);
        if (!l) return 'una lección';
        const mod = l.modules?.module_number ? `M${l.modules.module_number} · ` : '';
        return `${mod}${l.title}`;
    }, [lessonById]);

    /* Lección "completa" = cumplió todo lo que esa lección le pedía */
    const stats = useMemo(() => {
        const progressByLesson = new Map(progress.map(p => [p.lesson_id, p]));
        const assignmentByLesson = new Map(assignments.map(a => [a.lesson_id, a]));

        let completedLessons = 0;
        activeLessons.forEach(l => {
            const req = {
                video: Boolean(l.youtube_video_id || l.video_url),
                quiz: quizLessonIds.has(l.id),
                task: Boolean(l.task_description && l.task_description.trim())
            };
            if (!req.video && !req.quiz && !req.task) return;
            const p = progressByLesson.get(l.id);
            const a = assignmentByLesson.get(l.id);
            const okVideo = !req.video || Boolean(p?.video_completed);
            const okQuiz = !req.quiz || Boolean(p?.quiz_completed);
            const okTask = !req.task || a?.status === 'graded';
            if (okVideo && okQuiz && okTask) completedLessons += 1;
        });

        /* Promedio de quizzes: mejor intento por lección */
        const bestByLesson = new Map();
        attempts.forEach(at => {
            if (!at.max_score) return;
            const ratio = at.score / at.max_score;
            const prev = bestByLesson.get(at.lesson_id);
            if (prev === undefined || ratio > prev) bestByLesson.set(at.lesson_id, ratio);
        });
        const quizAvg = bestByLesson.size > 0
            ? Math.round([...bestByLesson.values()].reduce((s, v) => s + v, 0) / bestByLesson.size * 100)
            : null;

        const attTotal = attendance.length;
        const attPresent = attendance.filter(a => a.status === 'present').length;
        const attExcused = attendance.filter(a => a.status === 'excused').length;
        const attPercent = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;

        const tasksApproved = assignments.filter(a => a.status === 'graded').length;
        const tasksPending = assignments.filter(a => a.status !== 'graded').length;

        return {
            completedLessons,
            totalLessons: activeLessons.length,
            quizAvg,
            quizCount: bestByLesson.size,
            attPercent,
            attTotal,
            attExcused,
            tasksApproved,
            tasksPending
        };
    }, [activeLessons, progress, assignments, attendance, attempts, quizLessonIds]);

    const timeline = useMemo(() => {
        const events = [];

        progress.forEach(p => {
            if (!p.completed_at) return;
            events.push({
                id: `lp-${p.lesson_id}`,
                at: p.completed_at,
                type: 'leccion',
                icon: p.via_attendance ? '🙋' : '🎬',
                title: p.via_attendance
                    ? `Estuvo presente en ${lessonLabel(p.lesson_id)}`
                    : `Completó ${lessonLabel(p.lesson_id)}`
            });
        });

        assignments.forEach(a => {
            if (a.submitted_at) {
                events.push({
                    id: `as-${a.id}`,
                    at: a.submitted_at,
                    type: 'tarea',
                    icon: '📤',
                    title: `Entregó la tarea de ${lessonLabel(a.lesson_id)}`
                });
            }
            if (a.graded_at) {
                events.push({
                    id: `ag-${a.id}`,
                    at: a.graded_at,
                    type: 'correccion',
                    icon: '✅',
                    title: `Tarea corregida — ${lessonLabel(a.lesson_id)}`,
                    badge: a.grade !== null && a.grade !== undefined ? `Nota ${a.grade}` : null,
                    detail: a.feedback || null
                });
            }
        });

        attempts.forEach(at => {
            events.push({
                id: `qa-${at.id}`,
                at: at.completed_at,
                type: 'quiz',
                icon: '🧠',
                title: `Rindió el quiz de ${lessonLabel(at.lesson_id)}`,
                badge: at.max_score ? `${at.score}/${at.max_score}` : null
            });
        });

        attendance.forEach(a => {
            events.push({
                id: `at-${a.event_date}`,
                at: a.event_date,
                type: `asistencia-${a.status}`,
                icon: a.status === 'present' ? '🙌' : a.status === 'excused' ? '📝' : '🚫',
                title: `Asistencia: ${ATT_LABEL[a.status] || a.status}`,
                detail: a.notes || null
            });
        });

        return events
            .filter(e => e.at)
            .sort((a, b) => sortValue(b.at) - sortValue(a.at));
    }, [progress, assignments, attempts, attendance, lessonLabel]);

    if (loading) {
        return (
            <div className="sp-page">
                <div className="sp-card" style={{ marginBottom: 24 }}>
                    <Skeleton height={28} width="45%" style={{ marginBottom: 14 }} />
                    <Skeleton height={16} width="30%" />
                </div>
                <div className="sp-stats-grid">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="sp-card"><Skeleton lines={2} height={18} /></div>
                    ))}
                </div>
                <div className="sp-card" style={{ marginTop: 24 }}>
                    <Skeleton lines={6} height={16} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sp-page">
                <Link to="/admin/user-manager" className="admin-link-btn">← Volver a alumnos</Link>
                <div className="admin-error-banner" style={{ marginTop: 16 }}>
                    <span>No pudimos cargar el perfil de este alumno.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="sp-page">
                <Link to="/admin/user-manager" className="admin-link-btn">← Volver a alumnos</Link>
                <div className="admin-empty-state" style={{ marginTop: 16 }}>
                    No encontramos a este alumno. Puede que su cuenta haya sido eliminada.
                </div>
            </div>
        );
    }

    const initial = ((student.full_name && student.full_name[0]) || '?').toUpperCase();

    return (
        <div className="sp-page">
            <Link to="/admin/user-manager" className="admin-link-btn">← Volver a alumnos</Link>

            {/* Header */}
            <div className="sp-header sp-card">
                <div className="sp-avatar">{initial}</div>
                <div className="sp-identity">
                    <h1>{student.full_name || 'Sin nombre'}</h1>
                    <p className="sp-email">{student.email || 'Sin email registrado'}</p>
                    <div className="sp-tags">
                        <span className={`sp-tag sp-tag--role-${student.role}`}>
                            {student.role === 'admin' ? 'Admin' : student.role === 'mentor' ? 'Mentor' : 'Alumno'}
                        </span>
                        <span className={`sp-tag sp-tag--status-${student.status}`}>
                            {student.status === 'approved' ? 'Aprobado' : student.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                        {student.created_at && (
                            <span className="sp-tag sp-tag--plain">Alta: {formatDate(student.created_at)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="sp-stats-grid">
                <div className="sp-card sp-stat">
                    <span className="sp-stat-label">Lecciones completadas</span>
                    <span className="sp-stat-value">
                        {stats.completedLessons}<small> de {stats.totalLessons}</small>
                    </span>
                    <div className="sp-mini-bar">
                        <div
                            className="sp-mini-bar-fill"
                            style={{ width: `${stats.totalLessons ? (stats.completedLessons / stats.totalLessons) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                <div className="sp-card sp-stat">
                    <span className="sp-stat-label">Promedio de quizzes</span>
                    <span className="sp-stat-value">
                        {stats.quizAvg === null ? '—' : `${stats.quizAvg}%`}
                    </span>
                    <span className="sp-stat-foot">
                        {stats.quizCount === 0
                            ? 'Todavía no rindió ningún quiz'
                            : `Mejor intento en ${stats.quizCount} lección${stats.quizCount === 1 ? '' : 'es'}`}
                    </span>
                </div>

                <div className="sp-card sp-stat">
                    <span className="sp-stat-label">Asistencia</span>
                    <span className="sp-stat-value">
                        {stats.attPercent === null ? '—' : `${stats.attPercent}%`}
                    </span>
                    <span className="sp-stat-foot">
                        {stats.attTotal === 0
                            ? 'Sin encuentros registrados'
                            : `${stats.attTotal} encuentro${stats.attTotal === 1 ? '' : 's'} · ${stats.attExcused} justificada${stats.attExcused === 1 ? '' : 's'}`}
                    </span>
                </div>

                <div className="sp-card sp-stat">
                    <span className="sp-stat-label">Tareas</span>
                    <span className="sp-stat-value">
                        {stats.tasksApproved}<small> aprobadas</small>
                    </span>
                    <span className="sp-stat-foot">
                        {stats.tasksPending === 0
                            ? 'Nada pendiente de corrección'
                            : `${stats.tasksPending} sin corregir`}
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <div className="sp-section">
                <h2 className="sp-section-title">Línea de tiempo</h2>
                {timeline.length === 0 ? (
                    <div className="admin-empty-state">
                        Todavía no hay actividad registrada. En cuanto vea una clase, entregue una tarea o marque asistencia, va a aparecer acá.
                    </div>
                ) : (
                    <ol className="sp-timeline">
                        {timeline.map(ev => (
                            <li key={ev.id} className={`sp-event sp-event--${ev.type}`}>
                                <span className="sp-event-icon" aria-hidden="true">{ev.icon}</span>
                                <div className="sp-event-body">
                                    <div className="sp-event-head">
                                        <strong>{ev.title}</strong>
                                        {ev.badge && <span className="sp-event-badge">{ev.badge}</span>}
                                    </div>
                                    <span className="sp-event-date">{formatDate(ev.at)}</span>
                                    {ev.detail && <p className="sp-event-detail">{ev.detail}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}
