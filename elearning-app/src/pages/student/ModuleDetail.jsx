import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Skeleton } from '../../components/Toast';
import './ModuleDetail.css';

// Estado de la tarea del alumno → etiqueta + color
function assignmentChip(asg) {
    if (!asg) return null;
    if (asg.status === 'graded') {
        return asg.grade === 100
            ? { label: '✓ Tarea aprobada', tone: 'ok' }
            : { label: '↺ Tarea a rehacer', tone: 'danger' };
    }
    if (asg.status === 'submitted') return { label: '✓ Tarea entregada', tone: 'warn' };
    return null;
}

export default function ModuleDetail() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [module, setModule] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [progressByLesson, setProgressByLesson] = useState({});
    const [quizByLesson, setQuizByLesson] = useState({});
    const [assignmentByLesson, setAssignmentByLesson] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!moduleId || !profile) return;
        setLoading(true);
        setError(null);

        try {
            const [modRes, lsnRes] = await Promise.all([
                supabase.from('modules').select('*').eq('id', moduleId).single(),
                supabase
                    .from('lessons')
                    .select('id, title, lesson_number, available_from, estimated_minutes')
                    .eq('module_id', moduleId)
                    .order('lesson_number', { ascending: true }),
            ]);

            if (modRes.error) throw modRes.error;
            if (lsnRes.error) throw lsnRes.error;

            const lessonList = lsnRes.data || [];
            const lessonIds = lessonList.map(l => l.id);

            let progressMap = {};
            let quizMap = {};
            let assignmentMap = {};

            if (lessonIds.length > 0) {
                const [progRes, quizRes, asgRes] = await Promise.all([
                    supabase
                        .from('lesson_progress')
                        .select('lesson_id, video_completed, via_attendance')
                        .eq('user_id', profile.id)
                        .in('lesson_id', lessonIds),
                    supabase
                        .from('quiz_attempts')
                        .select('lesson_id, score, max_score')
                        .eq('user_id', profile.id)
                        .in('lesson_id', lessonIds),
                    supabase
                        .from('assignments')
                        .select('lesson_id, status, grade')
                        .eq('user_id', profile.id)
                        .in('lesson_id', lessonIds),
                ]);

                if (progRes.error) throw progRes.error;
                if (quizRes.error) throw quizRes.error;
                if (asgRes.error) throw asgRes.error;

                (progRes.data || []).forEach(p => { progressMap[p.lesson_id] = p; });
                // Si hubiera más de un intento, nos quedamos con el mejor puntaje
                (quizRes.data || []).forEach(q => {
                    const prev = quizMap[q.lesson_id];
                    if (!prev || (q.score ?? 0) > (prev.score ?? 0)) quizMap[q.lesson_id] = q;
                });
                (asgRes.data || []).forEach(a => { assignmentMap[a.lesson_id] = a; });
            }

            setModule(modRes.data);
            setLessons(lessonList);
            setProgressByLesson(progressMap);
            setQuizByLesson(quizMap);
            setAssignmentByLesson(assignmentMap);
        } catch (err) {
            console.error('Error loading module detail:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [moduleId, profile, supabase]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="module-detail">
                <Skeleton height={40} width={180} />
                <Skeleton height={34} width="70%" style={{ marginTop: 24 }} />
                <Skeleton lines={2} height={12} style={{ marginTop: 14 }} />
                <div className="md-lessons" style={{ marginTop: 28 }}>
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} height={78} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="module-detail">
                <div className="md-error">
                    <p className="md-error-title">No pudimos cargar el módulo.</p>
                    <p className="md-error-sub">Revisá tu conexión e intentá de nuevo.</p>
                    <button className="eco-primary-btn" onClick={load}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (!module) {
        return (
            <div className="module-detail">
                <div className="md-error">
                    <p className="md-error-title">Módulo no encontrado.</p>
                    <button className="eco-primary-btn" onClick={() => navigate('/dashboard/modules')}>
                        Ver Módulos
                    </button>
                </div>
            </div>
        );
    }

    // Fecha de hoy en horario de Buenos Aires, para evitar desfasajes UTC
    const baDateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date()); // "YYYY-MM-DD"
    const todayBA = new Date(`${baDateString}T00:00:00`);

    return (
        <div className="module-detail">
            <button onClick={() => navigate(-1)} className="md-back-btn">
                ← Volver a Módulos
            </button>

            <h1 className="md-title">
                Módulo {module.module_number}: {module.title}
            </h1>
            {module.description && <p className="md-desc">{module.description}</p>}

            <div className="md-lessons">
                {lessons.map(lesson => {
                    let isLocked = false;
                    let availableDateStr = '';
                    if (lesson.available_from) {
                        const lessonDate = new Date(`${lesson.available_from}T00:00:00`);
                        if (todayBA < lessonDate) {
                            isLocked = true;
                            availableDateStr = new Intl.DateTimeFormat('es-ES', {
                                timeZone: 'America/Argentina/Buenos_Aires',
                                day: 'numeric', month: 'long', year: 'numeric',
                            }).format(lessonDate);
                        }
                    }

                    const videoDone = !!progressByLesson[lesson.id]?.video_completed;
                    const videoPresent = videoDone && !!progressByLesson[lesson.id]?.via_attendance;
                    const quiz = quizByLesson[lesson.id];
                    const asgChip = assignmentChip(assignmentByLesson[lesson.id]);
                    const hasChips = videoDone || !!quiz || !!asgChip;

                    return (
                        <div
                            key={lesson.id}
                            className={`md-lesson${isLocked ? ' md-lesson--locked' : ''}`}
                        >
                            <div className="md-lesson-main">
                                <div className="md-lesson-title">
                                    {module.module_number}.{lesson.lesson_number} — {lesson.title}
                                </div>

                                {isLocked ? (
                                    <div className="md-lesson-lockinfo">
                                        🔒 Se habilita el {availableDateStr}
                                    </div>
                                ) : (
                                    <>
                                        {lesson.estimated_minutes ? (
                                            <div className="md-lesson-meta">⏱ {lesson.estimated_minutes} min</div>
                                        ) : null}

                                        <div className="md-chips">
                                            {videoDone && (
                                                <span className="md-chip md-chip--ok">
                                                    {videoPresent ? '✓ Presente en clase' : '✓ Video visto'}
                                                </span>
                                            )}
                                            {quiz && (
                                                <span className="md-chip md-chip--ok">
                                                    ✓ Quiz {quiz.score ?? 0}/{quiz.max_score ?? 0}
                                                </span>
                                            )}
                                            {asgChip && (
                                                <span className={`md-chip md-chip--${asgChip.tone}`}>
                                                    {asgChip.label}
                                                </span>
                                            )}
                                            {!hasChips && <span className="md-chip md-chip--muted">Sin empezar</span>}
                                        </div>
                                    </>
                                )}
                            </div>

                            {isLocked ? (
                                <button
                                    disabled
                                    className="md-action md-action--disabled"
                                    title={`Esta clase se habilita el ${availableDateStr}`}
                                >
                                    No disponible
                                </button>
                            ) : (
                                <Link to={`/dashboard/lesson/${lesson.id}`} className="md-action">
                                    Ver clase →
                                </Link>
                            )}
                        </div>
                    );
                })}

                {lessons.length === 0 && (
                    <p className="md-empty">No hay clases cargadas en este módulo todavía.</p>
                )}
            </div>
        </div>
    );
}
