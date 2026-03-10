import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Link } from 'react-router-dom';
import './DashboardHome.css';

export default function DashboardHome() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [resumeLesson, setResumeLesson] = useState(null);
    const [stats, setStats] = useState({ completedLessons: 0, pendingTasks: 0, attendances: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;
        let isMounted = true;

        async function loadDashboardData() {
            try {
                setLoading(true);

                const [lessonsRes, tasksRes, attendanceRes, lastLessonRes] = await Promise.all([
                    supabase
                        .from('lesson_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', profile.id)
                        .eq('video_completed', true),
                    supabase
                        .from('assignments')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', profile.id)
                        .eq('status', 'submitted'),
                    supabase
                        .from('attendance')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', profile.id)
                        .eq('status', 'present'),
                    // Fetch last accessed lesson (by completed_at desc)
                    supabase
                        .from('lesson_progress')
                        .select('lesson_id, completed_at, lessons(id, title, lesson_number, module_id, modules(id, title, module_number))')
                        .eq('user_id', profile.id)
                        .order('completed_at', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                ]);

                if (isMounted) {
                    setStats({
                        completedLessons: lessonsRes.count || 0,
                        pendingTasks: tasksRes.count || 0,
                        attendances: attendanceRes.count || 0,
                    });
                    if (lastLessonRes.data?.lessons) {
                        setResumeLesson(lastLessonRes.data);
                    }
                }
            } catch (err) {
                console.error('Error loading dashboard data:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadDashboardData();
        return () => { isMounted = false; };
    }, [profile, supabase]);

    if (loading) return <div className="dashboard-loading">Cargando tu progreso...</div>;

    const lesson = resumeLesson?.lessons;
    const mod = lesson?.modules;

    return (
        <div className="dashboard-home">
            <h1 className="page-title">¡Hola, {profile?.full_name?.split(' ')[0]}!</h1>
            <p className="page-subtitle">Es momento de expandir tu ECO.</p>

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
                        <p>{stats.pendingTasks}</p>
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

            {/* Resume Section — always points to the last specific lesson */}
            <section className="resume-section">
                <h2>Continuar aprendiendo</h2>

                {lesson && mod ? (
                    <div className="resume-card">
                        <div className="resume-info">
                            <span className="module-badge">Módulo {mod.module_number} · Clase {lesson.lesson_number}</span>
                            <h3>{lesson.title}</h3>
                            <p className="resume-module-name">{mod.title}</p>
                        </div>
                        <div className="resume-action">
                            <Link to={`/dashboard/lesson/${lesson.id}`} className="eco-primary-btn">
                                Continuar clase
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Todavía no empezaste ninguna clase.</p>
                        <Link to="/dashboard/modules" className="eco-primary-btn">Ver Módulos</Link>
                    </div>
                )}
            </section>
        </div>
    );
}
