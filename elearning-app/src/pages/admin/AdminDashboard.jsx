import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/Toast';
import './AdminDashboard.css';

const INACTIVE_DAYS = 14;

/* Trae todas las filas paginando de a 1000 (límite por defecto de Supabase). */
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

function toTime(value) {
    if (!value) return 0;
    const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function daysSince(time) {
    if (!time) return null;
    return Math.floor((Date.now() - time) / 86400000);
}

export default function AdminDashboard() {
    const supabase = useSupabase();
    const [stats, setStats] = useState({ totalUsers: 0, activeModules: 0, pendingGrades: 0 });
    const [recentAssignments, setRecentAssignments] = useState([]);
    const [inactive, setInactive] = useState([]);
    const [moduleCompletion, setModuleCompletion] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [showInactive, setShowInactive] = useState(false);

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function loadAdminData() {
            try {
                setLoading(true);
                setError(false);

                const [usersRes, modulesRes, gradesRes, assignmentsRes, studentsRes, activeModulesRes, lessonsRes] =
                    await Promise.all([
                        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
                        supabase.from('modules').select('id', { count: 'exact', head: true }).eq('is_active', true),
                        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
                        supabase
                            .from('assignments')
                            .select('id, status, submitted_at, profiles!user_id(full_name), lessons (title, modules(module_number))')
                            .eq('status', 'submitted')
                            .order('submitted_at', { ascending: false })
                            .limit(5),
                        supabase
                            .from('profiles')
                            .select('id, full_name')
                            .eq('status', 'approved')
                            .neq('role', 'admin')
                            .order('full_name', { ascending: true }),
                        supabase
                            .from('modules')
                            .select('id, title, module_number')
                            .eq('is_active', true)
                            .order('module_number', { ascending: true }),
                        supabase.from('lessons').select('id, module_id')
                    ]);

                const firstError = [usersRes, modulesRes, gradesRes, assignmentsRes, studentsRes, activeModulesRes, lessonsRes]
                    .map(r => r.error).find(Boolean);
                if (firstError) throw firstError;

                const [progressRows, submittedRows, attendanceRows] = await Promise.all([
                    fetchAllRows(() => supabase
                        .from('lesson_progress')
                        .select('user_id, lesson_id, video_completed, completed_at')),
                    fetchAllRows(() => supabase
                        .from('assignments')
                        .select('user_id, submitted_at')),
                    fetchAllRows(() => supabase
                        .from('attendance')
                        .select('user_id, event_date')
                        .eq('status', 'present'))
                ]);

                if (!isMounted) return;

                setStats({
                    totalUsers: usersRes.count || 0,
                    activeModules: modulesRes.count || 0,
                    pendingGrades: gradesRes.count || 0
                });
                setRecentAssignments(assignmentsRes.data || []);

                /* ── Última actividad por alumno ── */
                const lastActivity = new Map();
                const bump = (userId, value) => {
                    const t = toTime(value);
                    if (!t) return;
                    if (t > (lastActivity.get(userId) || 0)) lastActivity.set(userId, t);
                };
                progressRows.forEach(r => bump(r.user_id, r.completed_at));
                submittedRows.forEach(r => bump(r.user_id, r.submitted_at));
                attendanceRows.forEach(r => bump(r.user_id, r.event_date));

                const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
                const students = studentsRes.data || [];
                const inactives = students
                    .map(s => ({ ...s, lastAt: lastActivity.get(s.id) || 0 }))
                    .filter(s => s.lastAt < cutoff)
                    .sort((a, b) => a.lastAt - b.lastAt);
                setInactive(inactives);

                /* ── Finalización por módulo (videos vistos) ── */
                const moduleOfLesson = new Map();
                const lessonsPerModule = new Map();
                (lessonsRes.data || []).forEach(l => {
                    if (!l.module_id) return;
                    moduleOfLesson.set(l.id, l.module_id);
                    lessonsPerModule.set(l.module_id, (lessonsPerModule.get(l.module_id) || 0) + 1);
                });

                const studentIds = new Set(students.map(s => s.id));
                const watchedByModule = new Map();
                progressRows.forEach(r => {
                    if (!r.video_completed || !studentIds.has(r.user_id)) return;
                    const moduleId = moduleOfLesson.get(r.lesson_id);
                    if (!moduleId) return;
                    watchedByModule.set(moduleId, (watchedByModule.get(moduleId) || 0) + 1);
                });

                setModuleCompletion((activeModulesRes.data || []).map(m => {
                    const lessonCount = lessonsPerModule.get(m.id) || 0;
                    const denominator = lessonCount * students.length;
                    const watched = watchedByModule.get(m.id) || 0;
                    return {
                        id: m.id,
                        title: m.title,
                        moduleNumber: m.module_number,
                        lessonCount,
                        percent: denominator > 0 ? Math.round((watched / denominator) * 100) : null
                    };
                }));
            } catch (err) {
                console.error('Error loading admin dashboard:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadAdminData();
        return () => { isMounted = false; };
    }, [supabase, reloadToken]);

    const shortcuts = useMemo(() => ([
        { to: '/admin/progress', icon: '🧭', title: 'Matriz de progreso', text: 'Quién va atrás, lección por lección' },
        { to: '/admin/quizzes', icon: '🧠', title: 'Quizzes', text: 'Preguntas que más se fallan' },
        { to: '/admin/attendance-stats', icon: '📈', title: 'Asistencia', text: 'Porcentajes por alumno y por fecha' },
        { to: '/admin/user-manager', icon: '👤', title: 'Alumnos', text: 'Perfil 360 de cada persona' }
    ]), []);

    if (loading) {
        return (
            <div className="admin-dashboard">
                <h1 className="admin-page-title">Bienvenido al Panel de Control</h1>
                <div className="admin-stats-grid">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="admin-stat-card">
                            <div className="stat-content" style={{ width: '100%' }}>
                                <Skeleton height={14} width="55%" style={{ marginBottom: 12 }} />
                                <Skeleton height={26} width="35%" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="admin-panel" style={{ marginBottom: 24 }}>
                    <Skeleton lines={4} height={16} />
                </div>
                <div className="admin-panel">
                    <Skeleton lines={5} height={16} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard">
                <h1 className="admin-page-title">Bienvenido al Panel de Control</h1>
                <div className="admin-error-banner">
                    <span>No pudimos cargar las métricas del panel.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <h1 className="admin-page-title">Bienvenido al Panel de Control</h1>

            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Alumnos</h3>
                        <p>{stats.totalUsers}</p>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-content">
                        <h3>Módulos Activos</h3>
                        <p>{stats.activeModules}</p>
                    </div>
                </div>
                <div className="admin-stat-card highlight">
                    <div className="stat-icon">📥</div>
                    <div className="stat-content">
                        <h3>Entregas Pendientes</h3>
                        <p>{stats.pendingGrades}</p>
                    </div>
                </div>

                {/* Radar: inactivos */}
                <button
                    type="button"
                    className={`admin-stat-card admin-stat-card--button ${inactive.length > 0 ? 'alert' : ''}`}
                    onClick={() => setShowInactive(v => !v)}
                    aria-expanded={showInactive}
                >
                    <div className="stat-icon">{inactive.length > 0 ? '🚨' : '💚'}</div>
                    <div className="stat-content">
                        <h3>Inactivos +{INACTIVE_DAYS} días</h3>
                        <p>{inactive.length}</p>
                    </div>
                    <span className="stat-chevron">{showInactive ? '▲' : '▼'}</span>
                </button>
            </div>

            {showInactive && (
                <div className="admin-panel admin-panel--alert">
                    <div className="section-header">
                        <h2>Alumnos que necesitan un llamado</h2>
                        <button className="admin-link-btn admin-link-btn--ghost" onClick={() => setShowInactive(false)}>
                            Ocultar
                        </button>
                    </div>
                    {inactive.length === 0 ? (
                        <div className="admin-empty-state">
                            Todos tuvieron alguna actividad en los últimos {INACTIVE_DAYS} días. ¡Buen seguimiento!
                        </div>
                    ) : (
                        <ul className="inactive-list">
                            {inactive.map(s => {
                                const d = daysSince(s.lastAt);
                                return (
                                    <li key={s.id} className="inactive-item">
                                        <Link to={`/admin/students/${s.id}`} className="inactive-name">
                                            {s.full_name || 'Sin nombre'}
                                        </Link>
                                        <span className="inactive-meta">
                                            {d === null ? 'sin actividad registrada' : `hace ${d} días`}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* Accesos rápidos */}
            <div className="admin-shortcuts">
                {shortcuts.map(s => (
                    <Link key={s.to} to={s.to} className="admin-shortcut">
                        <span className="admin-shortcut-icon">{s.icon}</span>
                        <span className="admin-shortcut-text">
                            <strong>{s.title}</strong>
                            <small>{s.text}</small>
                        </span>
                    </Link>
                ))}
            </div>

            {/* Finalización por módulo */}
            <div className="admin-panel">
                <div className="section-header">
                    <h2>Finalización por módulo</h2>
                    <Link to="/admin/progress" className="admin-link-btn">Ver matriz completa</Link>
                </div>
                {moduleCompletion.length === 0 ? (
                    <div className="admin-empty-state">Todavía no hay módulos activos con lecciones cargadas.</div>
                ) : (
                    <ul className="module-completion-list">
                        {moduleCompletion.map(m => (
                            <li key={m.id} className="module-completion-row">
                                <span className="module-completion-name">
                                    <span className="mod-label">M{m.moduleNumber}</span>
                                    {m.title}
                                </span>
                                <div className="module-completion-bar">
                                    <div
                                        className={`module-completion-fill ${(m.percent ?? 0) < 34 ? 'is-low' : (m.percent ?? 0) < 67 ? 'is-mid' : 'is-high'}`}
                                        style={{ width: `${m.percent ?? 0}%` }}
                                    />
                                </div>
                                <span className="module-completion-pct">
                                    {m.percent === null ? '—' : `${m.percent}%`}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="module-completion-foot">
                    Porcentaje de videos vistos sobre el total de alumnos aprobados × lecciones del módulo.
                </p>
            </div>

            <div className="admin-recent-section">
                <div className="section-header">
                    <h2>Tareas por corregir</h2>
                    <Link to="/admin/assignments" className="admin-link-btn">Ver todas</Link>
                </div>

                {recentAssignments.length === 0 ? (
                    <div className="admin-empty-state">No hay tareas pendientes de corrección. ¡Excelente!</div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Alumno</th>
                                    <th>Lección</th>
                                    <th>Fecha de Entrega</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAssignments.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.profiles?.full_name || 'Usuario'}</td>
                                        <td>
                                            <span className="mod-label">M{a.lessons?.modules?.module_number}</span>
                                            {a.lessons?.title}
                                        </td>
                                        <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
                                        <td>
                                            <Link to={`/admin/assignments/${a.id}`} className="admin-action-btn">
                                                Corregir
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
