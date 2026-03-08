import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import './AchievementsPage.css';

const ACHIEVEMENTS = [
    // ── Clases ──────────────────────────────────────────────
    {
        id: 'lesson_1',
        icon: '🌱',
        title: 'Primeros Pasos',
        desc: 'Completaste tu primera clase.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 1,
    },
    {
        id: 'lesson_2',
        icon: '🔑',
        title: 'Abriendo Puertas',
        desc: 'Completaste 2 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 2,
    },
    {
        id: 'lesson_3',
        icon: '✨',
        title: 'Tomando Impulso',
        desc: 'Completaste 3 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 3,
    },
    {
        id: 'lesson_5',
        icon: '🔥',
        title: 'En Llamas',
        desc: 'Completaste 5 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 5,
    },
    {
        id: 'lesson_7',
        icon: '⚡',
        title: 'A Toda Potencia',
        desc: 'Completaste 7 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 7,
    },
    {
        id: 'lesson_10',
        icon: '🏃',
        title: 'Imparable',
        desc: 'Completaste 10 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 10,
    },
    {
        id: 'lesson_12',
        icon: '🎯',
        title: 'En la Recta Final',
        desc: 'Completaste 12 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 12,
    },
    {
        id: 'lesson_14',
        icon: '🦅',
        title: 'Elevando el Vuelo',
        desc: 'Completaste 14 clases.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 14,
    },
    {
        id: 'lesson_16',
        icon: '🏆',
        title: 'ECO Completo',
        desc: '¡Completaste las 16 clases! Sos parte de ECO.',
        category: 'Clases',
        check: (s) => s.completedLessons >= 16,
    },

    // ── Módulos ──────────────────────────────────────────────
    {
        id: 'module_1',
        icon: '🏅',
        title: 'Módulo Completado',
        desc: 'Terminaste tu primer módulo.',
        category: 'Módulos',
        check: (s) => s.completedModules >= 1,
    },
    {
        id: 'module_2',
        icon: '🥈',
        title: 'Segundo Nivel',
        desc: 'Completaste 2 módulos.',
        category: 'Módulos',
        check: (s) => s.completedModules >= 2,
    },
    {
        id: 'module_3',
        icon: '🥇',
        title: 'Explorador ECO',
        desc: 'Completaste 3 módulos.',
        category: 'Módulos',
        check: (s) => s.completedModules >= 3,
    },
    {
        id: 'module_4',
        icon: '🌿',
        title: 'Arraigado',
        desc: 'Completaste 4 módulos.',
        category: 'Módulos',
        check: (s) => s.completedModules >= 4,
    },

    // ── Tareas ──────────────────────────────────────────────
    {
        id: 'task_1',
        icon: '📝',
        title: 'Manos a la Obra',
        desc: 'Entregaste tu primera tarea.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 1,
    },
    {
        id: 'task_2',
        icon: '✍️',
        title: 'Constante',
        desc: 'Entregaste 2 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 2,
    },
    {
        id: 'task_4',
        icon: '📚',
        title: 'Estudioso',
        desc: 'Entregaste 4 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 4,
    },
    {
        id: 'task_6',
        icon: '💡',
        title: 'Reflexivo',
        desc: 'Entregaste 6 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 6,
    },
    {
        id: 'task_8',
        icon: '🎓',
        title: 'Dedicado',
        desc: 'Entregaste 8 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 8,
    },
    {
        id: 'task_10',
        icon: '🔬',
        title: 'Profundizando',
        desc: 'Entregaste 10 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 10,
    },
    {
        id: 'task_12',
        icon: '🧩',
        title: 'Comprometido con el Proceso',
        desc: 'Entregaste 12 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 12,
    },
    {
        id: 'task_14',
        icon: '🌠',
        title: 'Casi en la Cima',
        desc: 'Entregaste 14 tareas.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 14,
    },
    {
        id: 'task_16',
        icon: '🎖️',
        title: 'Maestro de Tareas',
        desc: '¡Entregaste las 16 tareas! Esfuerzo total.',
        category: 'Tareas',
        check: (s) => s.submittedAssignments >= 16,
    },

    // ── Asistencia ──────────────────────────────────────────
    {
        id: 'att_1',
        icon: '✋',
        title: 'Presente',
        desc: 'Registraste tu primera asistencia.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 1,
    },
    {
        id: 'att_5',
        icon: '🙌',
        title: 'Fiel',
        desc: 'Asististe 5 veces.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 5,
    },
    {
        id: 'att_8',
        icon: '💪',
        title: 'Perseverante',
        desc: 'Asististe 8 veces.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 8,
    },
    {
        id: 'att_10',
        icon: '💎',
        title: 'Irrompible',
        desc: 'Asististe 10 veces.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 10,
    },
    {
        id: 'att_14',
        icon: '🕊️',
        title: 'Siempre Aquí',
        desc: 'Asististe 14 veces.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 14,
    },
    {
        id: 'att_16',
        icon: '🫂',
        title: 'Corazón de ECO',
        desc: '¡Asististe las 16 veces! Sos el corazón de la comunidad.',
        category: 'Asistencia',
        check: (s) => s.attendances >= 16,
    },

    // ── Rachas ──────────────────────────────────────────────
    {
        id: 'streak_3',
        icon: '🌟',
        title: 'Racha de Fuego',
        desc: 'Mantuviste una racha de 3 días.',
        category: 'Rachas',
        check: (s) => s.currentStreak >= 3,
    },
    {
        id: 'streak_7',
        icon: '🚀',
        title: 'Una Semana Seguida',
        desc: 'Mantuviste una racha de 7 días.',
        category: 'Rachas',
        check: (s) => s.currentStreak >= 7,
    },
    {
        id: 'streak_14',
        icon: '☄️',
        title: 'Dos Semanas Seguidas',
        desc: 'Mantuviste una racha de 14 días.',
        category: 'Rachas',
        check: (s) => s.currentStreak >= 14,
    },

    // ── Puntos ──────────────────────────────────────────────
    {
        id: 'points_50',
        icon: '⭐',
        title: 'Acumulando Gloria',
        desc: 'Alcanzaste 50 puntos ECO.',
        category: 'Puntos',
        check: (s) => s.ecoPoints >= 50,
    },
    {
        id: 'points_100',
        icon: '👑',
        title: 'Cien Puntos',
        desc: 'Alcanzaste 100 puntos ECO.',
        category: 'Puntos',
        check: (s) => s.ecoPoints >= 100,
    },
    {
        id: 'points_200',
        icon: '💫',
        title: 'Doscientos Puntos',
        desc: 'Alcanzaste 200 puntos ECO.',
        category: 'Puntos',
        check: (s) => s.ecoPoints >= 200,
    },

    // ── Quiz ──────────────────────────────────────────────
    {
        id: 'quiz_1',
        icon: '🧠',
        title: 'Mente Aguda',
        desc: 'Completaste tu primer quiz.',
        category: 'Quiz',
        check: (s) => s.quizAttempts >= 1,
    },
    {
        id: 'quiz_5',
        icon: '🎯',
        title: 'Analítico',
        desc: 'Completaste 5 quizzes.',
        category: 'Quiz',
        check: (s) => s.quizAttempts >= 5,
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
    const categories = [...new Set(ACHIEVEMENTS.map(a => a.category))];

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
                <div className="summary-pill summary-pill--total">
                    <span className="pill-num">{ACHIEVEMENTS.length}</span>
                    <span className="pill-label">en total</span>
                </div>
            </div>

            {categories.map(cat => {
                const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat);
                const catUnlocked = catAchievements.filter(a => a.check(stats));
                return (
                    <section key={cat} className="achievements-section">
                        <div className="achievements-section-header">
                            <h2 className="section-heading" style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>{cat}</h2>
                            <span className="cat-progress">{catUnlocked.length}/{catAchievements.length}</span>
                        </div>
                        <div className="achievements-grid">
                            {catAchievements.map(a => {
                                const isUnlocked = a.check(stats);
                                return (
                                    <div key={a.id} className={`achievement-card ${isUnlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}`}>
                                        <div className={`achievement-icon ${isUnlocked ? '' : 'achievement-icon--locked'}`}>
                                            {isUnlocked ? a.icon : '🔒'}
                                        </div>
                                        <div className="achievement-info">
                                            <h3>{a.title}</h3>
                                            <p>{a.desc}</p>
                                        </div>
                                        {isUnlocked && <div className="achievement-check">✓</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
