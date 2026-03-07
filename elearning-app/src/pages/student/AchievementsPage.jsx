import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import './AchievementsPage.css';

const ACHIEVEMENTS = [
    {
        id: 'first_lesson',
        icon: '🌱',
        title: 'Primeros Pasos',
        desc: 'Completaste tu primera clase.',
        check: (s) => s.completedLessons >= 1,
    },
    {
        id: 'five_lessons',
        icon: '🔥',
        title: 'En Llamas',
        desc: 'Completaste 5 clases.',
        check: (s) => s.completedLessons >= 5,
    },
    {
        id: 'ten_lessons',
        icon: '⚡',
        title: 'Imparable',
        desc: 'Completaste 10 clases.',
        check: (s) => s.completedLessons >= 10,
    },
    {
        id: 'first_module',
        icon: '🏅',
        title: 'Módulo Completado',
        desc: 'Terminaste tu primer módulo.',
        check: (s) => s.completedModules >= 1,
    },
    {
        id: 'three_modules',
        icon: '🏆',
        title: 'Explorador ECO',
        desc: 'Completaste 3 módulos.',
        check: (s) => s.completedModules >= 3,
    },
    {
        id: 'first_task',
        icon: '📝',
        title: 'Manos a la Obra',
        desc: 'Entregaste tu primera tarea.',
        check: (s) => s.submittedAssignments >= 1,
    },
    {
        id: 'five_tasks',
        icon: '📚',
        title: 'Estudioso',
        desc: 'Entregaste 5 tareas.',
        check: (s) => s.submittedAssignments >= 5,
    },
    {
        id: 'first_attendance',
        icon: '✋',
        title: 'Presente',
        desc: 'Registraste tu primera asistencia.',
        check: (s) => s.attendances >= 1,
    },
    {
        id: 'five_attendances',
        icon: '🙌',
        title: 'Fiel',
        desc: 'Asististe 5 veces.',
        check: (s) => s.attendances >= 5,
    },
    {
        id: 'ten_attendances',
        icon: '💎',
        title: 'Comprometido',
        desc: 'Asististe 10 veces.',
        check: (s) => s.attendances >= 10,
    },
    {
        id: 'streak_3',
        icon: '🌟',
        title: 'Racha de Fuego',
        desc: 'Mantuviste una racha de 3 días.',
        check: (s) => s.currentStreak >= 3,
    },
    {
        id: 'streak_7',
        icon: '🚀',
        title: 'Una Semana Seguida',
        desc: 'Mantuviste una racha de 7 días.',
        check: (s) => s.currentStreak >= 7,
    },
    {
        id: 'points_50',
        icon: '⭐',
        title: 'Acumulando Gloria',
        desc: 'Alcanzaste 50 puntos ECO.',
        check: (s) => s.ecoPoints >= 50,
    },
    {
        id: 'points_100',
        icon: '👑',
        title: 'Cien Puntos',
        desc: 'Alcanzaste 100 puntos ECO.',
        check: (s) => s.ecoPoints >= 100,
    },
    {
        id: 'quiz_done',
        icon: '🧠',
        title: 'Mente Aguda',
        desc: 'Completaste tu primer quiz.',
        check: (s) => s.quizAttempts >= 1,
    },
];

export default function AchievementsPage() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;
        let isMounted = true;

        async function loadStats() {
            const [lessonsRes, modulesRes, assignmentsRes, attendanceRes, quizRes] = await Promise.all([
                supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('video_completed', true),
                supabase.from('user_progress').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'completed'),
                supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).in('status', ['submitted', 'graded']),
                supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'present'),
                supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
            ]);

            if (isMounted) {
                setStats({
                    completedLessons: lessonsRes.count || 0,
                    completedModules: modulesRes.count || 0,
                    submittedAssignments: assignmentsRes.count || 0,
                    attendances: attendanceRes.count || 0,
                    quizAttempts: quizRes.count || 0,
                    currentStreak: profile.current_streak || 0,
                    ecoPoints: profile.eco_points || 0,
                });
            }
        }

        loadStats().finally(() => isMounted && setLoading(false));
        return () => { isMounted = false; };
    }, [profile, supabase]);

    if (loading) return <div className="dashboard-loading">Cargando logros...</div>;

    const unlocked = ACHIEVEMENTS.filter(a => a.check(stats));
    const locked = ACHIEVEMENTS.filter(a => !a.check(stats));

    return (
        <div className="achievements-page">
            <h1 className="page-title">Mis Logros</h1>
            <p className="page-subtitle">Cada paso cuenta. Seguí avanzando.</p>

            <div className="achievements-summary">
                <div className="summary-pill">
                    <span className="pill-num">{unlocked.length}</span>
                    <span className="pill-label">desbloqueados</span>
                </div>
                <div className="summary-pill summary-pill--locked">
                    <span className="pill-num">{locked.length}</span>
                    <span className="pill-label">por obtener</span>
                </div>
            </div>

            {unlocked.length > 0 && (
                <section className="achievements-section">
                    <h2 className="section-heading">Obtenidos</h2>
                    <div className="achievements-grid">
                        {unlocked.map(a => (
                            <div key={a.id} className="achievement-card achievement-card--unlocked">
                                <div className="achievement-icon">{a.icon}</div>
                                <div className="achievement-info">
                                    <h3>{a.title}</h3>
                                    <p>{a.desc}</p>
                                </div>
                                <div className="achievement-check">✓</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {locked.length > 0 && (
                <section className="achievements-section">
                    <h2 className="section-heading">Por obtener</h2>
                    <div className="achievements-grid">
                        {locked.map(a => (
                            <div key={a.id} className="achievement-card achievement-card--locked">
                                <div className="achievement-icon achievement-icon--locked">🔒</div>
                                <div className="achievement-info">
                                    <h3>{a.title}</h3>
                                    <p>{a.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
