import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Link } from 'react-router-dom';
import './DashboardHome.css';

export default function DashboardHome() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [resumeData, setResumeData] = useState(null);
    const [stats, setStats] = useState({
        completedLessons: 0,
        pendingTasks: 0,
        attendances: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;

        let isMounted = true;

        async function loadDashboardData() {
            try {
                if (!isMounted) return;
                setLoading(true);

                // 1. Fetch user progress globally to calculate module unlocked states
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('module_id, status, progress_percentage, last_accessed')
                    .eq('user_id', profile.id)
                    .order('last_accessed', { ascending: false });

                // 2. Fetch last accessed module info to show in "Resume" card
                if (progressData && progressData.length > 0) {
                    const lastProgress = progressData[0];

                    const { data: moduleData } = await supabase
                        .from('modules')
                        .select('id, title, module_number')
                        .eq('id', lastProgress.module_id)
                        .single();

                    if (moduleData && isMounted) {
                        setResumeData({
                            module: moduleData,
                            progress: lastProgress
                        });
                    }
                }

                // 3. Fetch basic stats (in parallel like we did in vanilla JS)
                const [lessonsRes, tasksRes, attendanceRes] = await Promise.all([
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
                        .eq('attended', true)
                ]);

                if (isMounted) {
                    setStats({
                        completedLessons: lessonsRes.count || 0,
                        pendingTasks: tasksRes.count || 0,
                        attendances: attendanceRes.count || 0
                    });
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

    if (loading) {
        return <div className="dashboard-loading">Cargando tu progreso...</div>;
    }

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
                        <h3>Tareas pdtes.</h3>
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

            {/* Resume Section */}
            <section className="resume-section">
                <h2>Continuar aprendiendo</h2>

                {resumeData ? (
                    <div className="resume-card">
                        <div className="resume-info">
                            <span className="module-badge">Módulo {resumeData.module.module_number}</span>
                            <h3>{resumeData.module.title}</h3>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${resumeData.progress.progress_percentage}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">{resumeData.progress.progress_percentage}% completado</span>
                        </div>
                        <div className="resume-action">
                            <Link to={`/dashboard/modules/${resumeData.module.id}`} className="eco-primary-btn">
                                Continuar
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Todavía no has empezado ningún módulo.</p>
                        <Link to="/dashboard/modules" className="eco-primary-btn">Ver Módulos</Link>
                    </div>
                )}
            </section>
        </div>
    );
}
