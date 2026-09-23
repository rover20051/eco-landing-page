import React, { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Skeleton } from '../../components/Toast';
import { Link } from 'react-router-dom';
import './DashboardHome.css';

// Fecha "hoy" en zona horaria de Buenos Aires, para comparar contra available_from (YYYY-MM-DD)
function todayInBA() {
    const baDateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
    return new Date(`${baDateString}T00:00:00`);
}

export default function DashboardHome() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [stats, setStats] = useState({ completedLessons: 0, submittedTasks: 0, gradedTasks: 0, attendances: 0 });
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [nextLesson, setNextLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboardData = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Módulos activos + progreso del alumno + contadores
            const [modulesRes, progressRes, tasksRes, attendanceRes] = await Promise.all([
                supabase
                    .from('modules')
                    .select('id, title, module_number')
                    .eq('is_active', true)
                    .order('module_number', { ascending: true }),
                supabase
                    .from('lesson_progress')
                    .select('lesson_id, video_completed')
                    .eq('user_id', profile.id),
                supabase
                    .from('assignments')
                    .select('id, status')
                    .eq('user_id', profile.id)
                    .in('status', ['submitted', 'graded']),
                supabase
                    .from('attendance')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('status', 'present'),
            ]);

            if (modulesRes.error) throw modulesRes.error;
            if (progressRes.error) throw progressRes.error;
            if (tasksRes.error) throw tasksRes.error;
            if (attendanceRes.error) throw attendanceRes.error;

            const modules = modulesRes.data || [];
            const moduleIds = modules.map(m => m.id);

            // 2. Clases de los módulos activos
            let lessons = [];
            if (moduleIds.length > 0) {
                const lessonsRes = await supabase
                    .from('lessons')
                    .select('id, title, lesson_number, module_id, available_from')
                    .in('module_id', moduleIds)
                    .order('lesson_number', { ascending: true });
                if (lessonsRes.error) throw lessonsRes.error;
                lessons = lessonsRes.data || [];
            }

            // 3. Cálculo client-side del progreso global
            const completedIds = new Set(
                (progressRes.data || []).filter(p => p.video_completed).map(p => p.lesson_id)
            );
            const done = lessons.filter(l => completedIds.has(l.id)).length;

            // 4. Próxima clase: primera pendiente (orden módulo → clase) ya habilitada
            const moduleById = new Map(modules.map(m => [m.id, m]));
            const today = todayInBA();
            const ordered = [...lessons].sort((a, b) => {
                const modA = moduleById.get(a.module_id)?.module_number ?? 0;
                const modB = moduleById.get(b.module_id)?.module_number ?? 0;
                if (modA !== modB) return modA - modB;
                return (a.lesson_number ?? 0) - (b.lesson_number ?? 0);
            });

            const next = ordered.find(l => {
                if (completedIds.has(l.id)) return false;
                if (!l.available_from) return true;
                return new Date(`${l.available_from}T00:00:00`) <= today;
            });

            const taskRows = tasksRes.data || [];
            setStats({
                completedLessons: done,
                submittedTasks: taskRows.length,
                gradedTasks: taskRows.filter(t => t.status === 'graded').length,
                attendances: attendanceRes.count || 0,
            });
            setProgress({ done, total: lessons.length });
            setNextLesson(next ? { ...next, module: moduleById.get(next.module_id) || null } : null);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [profile, supabase]);

    useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

    const firstName = profile?.full_name?.split(' ')[0] || '';
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    const allDone = progress.total > 0 && progress.done >= progress.total;

    return (
        <div className="dashboard-home">
            <h1 className="page-title">¡Hola{firstName ? `, ${firstName}` : ''}!</h1>
            <p className="page-subtitle">Es momento de expandir tu ECO.</p>

            {loading ? (
                <div className="dash-skeletons">
                    <Skeleton height={92} />
                    <Skeleton height={130} style={{ marginTop: 24 }} />
                    <Skeleton height={100} style={{ marginTop: 24 }} />
                </div>
            ) : error ? (
                <div className="dash-error">
                    <p className="dash-error-title">No pudimos cargar tu progreso.</p>
                    <p className="dash-error-sub">Revisá tu conexión e intentá de nuevo.</p>
                    <button className="eco-primary-btn" onClick={loadDashboardData}>Reintentar</button>
                </div>
            ) : (
                <>
                    {/* Progreso global real */}
                    <section className="global-progress">
                        <div className="global-progress-head">
                            <h2>Tu progreso</h2>
                            <span className="global-progress-pct">{pct}%</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="progress-text">
                            {progress.total === 0
                                ? 'Todavía no hay clases publicadas.'
                                : `Completaste ${progress.done} de ${progress.total} clases`}
                        </p>
                    </section>

                    {/* Próxima clase */}
                    <section className="next-lesson-section">
                        <h2>Tu próxima clase</h2>

                        {nextLesson ? (
                            <div className="resume-card">
                                <div className="resume-info">
                                    <span className="module-badge">
                                        Módulo {nextLesson.module?.module_number ?? '—'} · Clase {nextLesson.lesson_number}
                                    </span>
                                    <h3>{nextLesson.title}</h3>
                                    {nextLesson.module?.title && (
                                        <p className="resume-module-name">{nextLesson.module.title}</p>
                                    )}
                                </div>
                                <div className="resume-action">
                                    <Link to={`/dashboard/lesson/${nextLesson.id}`} className="eco-primary-btn">
                                        Ir a la clase
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>
                                    {allDone
                                        ? '¡Completaste todas las clases disponibles! 🎉'
                                        : 'No hay clases habilitadas por ahora. Volvé cuando se libere la próxima.'}
                                </p>
                                <Link to="/dashboard/modules" className="eco-primary-btn">Ver Módulos</Link>
                            </div>
                        )}
                    </section>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📚</div>
                            <div className="stat-content">
                                <h3>Clases vistas</h3>
                                <p>{stats.completedLessons}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📝</div>
                            <div className="stat-content">
                                <h3>Tareas entregadas</h3>
                                <p>{stats.submittedTasks}</p>
                                {stats.submittedTasks > 0 && (
                                    <span className="stat-detail">
                                        ✓ {stats.gradedTasks} corregida{stats.gradedTasks !== 1 ? 's' : ''}
                                        {stats.submittedTasks - stats.gradedTasks > 0 &&
                                            ` · ⏳ ${stats.submittedTasks - stats.gradedTasks} en revisión`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="stat-card stat-attendance">
                            <div className="stat-icon">✋</div>
                            <div className="stat-content">
                                <h3>Asistencias</h3>
                                <p>{stats.attendances}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
