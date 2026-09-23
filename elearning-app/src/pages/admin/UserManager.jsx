import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton, useToast } from '../../components/Toast';
import './AdminDashboard.css'; // Reutilizamos estilos de tabla
import './UserManager.css';

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

function relativeLabel(time) {
    if (!time) return 'Sin actividad';
    const days = Math.floor((Date.now() - time) / 86400000);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 30) return `Hace ${days} días`;
    return new Date(time).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROLE_LABEL = { student: 'Alumno', mentor: 'Mentor', admin: 'Admin' };
const STATUS_LABEL = { pending: 'Pendiente', rejected: 'Rechazado' };

export default function UserManager() {
    const supabase = useSupabase();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function loadUsers() {
            try {
                setLoading(true);
                setError(false);

                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, status')
                    .order('full_name', { ascending: true });

                if (profilesError) throw profilesError;

                const [progressRows, assignmentRows, attendanceRows] = await Promise.all([
                    fetchAllRows(() => supabase
                        .from('lesson_progress')
                        .select('user_id, video_completed, completed_at')),
                    fetchAllRows(() => supabase
                        .from('assignments')
                        .select('user_id, submitted_at')),
                    fetchAllRows(() => supabase
                        .from('attendance')
                        .select('user_id, event_date')
                        .eq('status', 'present'))
                ]);

                if (!isMounted) return;

                const watched = new Map();
                const submitted = new Map();
                const lastActivity = new Map();
                const bump = (userId, value) => {
                    const t = toTime(value);
                    if (t > (lastActivity.get(userId) || 0)) lastActivity.set(userId, t);
                };

                progressRows.forEach(r => {
                    if (r.video_completed) watched.set(r.user_id, (watched.get(r.user_id) || 0) + 1);
                    bump(r.user_id, r.completed_at);
                });
                assignmentRows.forEach(r => {
                    submitted.set(r.user_id, (submitted.get(r.user_id) || 0) + 1);
                    bump(r.user_id, r.submitted_at);
                });
                attendanceRows.forEach(r => bump(r.user_id, r.event_date));

                setUsers((profiles || []).map(u => ({
                    ...u,
                    lessonsWatched: watched.get(u.id) || 0,
                    assignmentsSubmitted: submitted.get(u.id) || 0,
                    lastActivity: lastActivity.get(u.id) || 0
                })));
            } catch (err) {
                console.error('Error loading users:', err);
                if (isMounted) {
                    setError(true);
                    toast.error('No pudimos cargar la lista de alumnos.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadUsers();
        return () => { isMounted = false; };
        // toast es estable durante la vida del provider
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, reloadToken]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return users;
        return users.filter(u =>
            u.full_name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.role?.toLowerCase().includes(term)
        );
    }, [users, searchTerm]);

    if (loading) {
        return (
            <div className="admin-users-page">
                <h1 className="admin-page-title">Gestión de Alumnos</h1>
                <div className="admin-table-container" style={{ padding: 22 }}>
                    <Skeleton lines={8} height={20} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-users-page">
                <h1 className="admin-page-title">Gestión de Alumnos</h1>
                <div className="admin-error-banner">
                    <span>No pudimos cargar la lista de alumnos.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-users-page">
            <div className="section-header">
                <h1 className="admin-page-title" style={{ margin: 0 }}>Gestión de Alumnos</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="admin-empty-state">
                    {users.length === 0
                        ? 'Todavía no hay alumnos cargados en el campus.'
                        : 'No encontramos a nadie con ese nombre o email.'}
                </div>
            ) : (
                <>
                    {/* ── Tabla (escritorio) ── */}
                    <div className="admin-table-container um-desktop">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Rol</th>
                                    <th>Lecciones Vistas</th>
                                    <th>Tareas Enviadas</th>
                                    <th>Última actividad</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {user.full_name || 'Sin nombre'}
                                            {user.email && <span className="um-email">{user.email}</span>}
                                        </td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {ROLE_LABEL[user.role] || user.role}
                                            </span>
                                            {user.status !== 'approved' && (
                                                <span className="um-status">{STATUS_LABEL[user.status] || user.status}</span>
                                            )}
                                        </td>
                                        <td>{user.lessonsWatched}</td>
                                        <td>{user.assignmentsSubmitted}</td>
                                        <td>
                                            <span className={`um-activity ${user.lastActivity ? '' : 'is-idle'}`}>
                                                {relativeLabel(user.lastActivity)}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/admin/students/${user.id}`}
                                                className="eco-secondary-btn um-profile-btn"
                                            >
                                                Ver Perfil
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Cards (móvil) ── */}
                    <div className="um-mobile">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="um-card">
                                <div className="um-card-head">
                                    <div>
                                        <strong className="um-card-name">{user.full_name || 'Sin nombre'}</strong>
                                        {user.email && <span className="um-email">{user.email}</span>}
                                    </div>
                                    <span className="um-card-badges">
                                        <span className={`role-badge ${user.role}`}>
                                            {ROLE_LABEL[user.role] || user.role}
                                        </span>
                                        {user.status !== 'approved' && (
                                            <span className="um-status">{STATUS_LABEL[user.status] || user.status}</span>
                                        )}
                                    </span>
                                </div>

                                <div className="um-card-metrics">
                                    <div>
                                        <span className="um-metric-value">{user.lessonsWatched}</span>
                                        <span className="um-metric-label">Lecciones</span>
                                    </div>
                                    <div>
                                        <span className="um-metric-value">{user.assignmentsSubmitted}</span>
                                        <span className="um-metric-label">Tareas</span>
                                    </div>
                                </div>

                                <div className="um-card-foot">
                                    <span className={`um-activity ${user.lastActivity ? '' : 'is-idle'}`}>
                                        {relativeLabel(user.lastActivity)}
                                    </span>
                                    <Link to={`/admin/students/${user.id}`} className="eco-secondary-btn um-profile-btn">
                                        Ver Perfil
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
