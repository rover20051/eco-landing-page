import { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { useUserProfile } from '../hooks/useSupabase';
import { useSupabase } from '../contexts/SupabaseContext';
import './StudentApp.css';

const BASE = import.meta.env.BASE_URL;
const TYPE_ICON = { class_unlocked: '🔓', assignment_graded: '📝', attendance: '✋' };

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} días`;
}

export default function StudentApp() {
    const { signOut } = useClerk();
    const { profile, loading, updateProfile } = useUserProfile();
    const supabase = useSupabase();
    const navigate = useNavigate();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifs, setRecentNotifs] = useState([]);
    const [showBell, setShowBell] = useState(false);
    const bellRef = useRef(null);

    // Mobile sidebar
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Edit name
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Close sidebar on navigation
    useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

    const fetchNotifs = useCallback(async () => {
        if (!profile) return;
        const { data, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', profile.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);
        setUnreadCount(count || 0);
        setRecentNotifs(data || []);
    }, [profile, supabase]);

    useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

    useEffect(() => {
        if (!profile) return;
        const channel = supabase
            .channel(`notifs-badge-${profile.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profile.id}`,
            }, () => { fetchNotifs(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile, supabase, fetchNotifs]);

    useEffect(() => {
        function handler(e) {
            if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Resuelve a qué clase apunta una notificación (null si no apunta a ninguna)
    const resolveNotifTarget = useCallback(async (n) => {
        const isAssignment = n.type === 'assignment_graded';
        const suffix = isAssignment ? '?scroll=assignment' : '';

        if (n.data?.lesson_id) return `/dashboard/lesson/${n.data.lesson_id}${suffix}`;

        if (isAssignment && n.data?.assignment_id) {
            const { data } = await supabase
                .from('assignments')
                .select('lesson_id')
                .eq('id', n.data.assignment_id)
                .single();
            if (data?.lesson_id) return `/dashboard/lesson/${data.lesson_id}${suffix}`;
        }
        return null;
    }, [supabase]);

    // Al clickear UNA notificación se marca leída SOLO esa (antes se marcaban todas)
    async function openNotif(n) {
        setShowBell(false);
        if (!n.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
            setRecentNotifs(prev => prev.filter(x => x.id !== n.id));
            setUnreadCount(c => Math.max(0, c - 1));
        }
        const target = await resolveNotifTarget(n);
        if (target) navigate(target);
    }

    function goToAllNotifs() {
        setShowBell(false);
        navigate('/dashboard/notifications');
    }

    function startEditName() {
        setNameInput(profile?.full_name || '');
        setEditingName(true);
    }

    async function saveName() {
        const trimmed = nameInput.trim();
        if (!trimmed || trimmed === profile?.full_name) {
            setEditingName(false);
            return;
        }
        setSavingName(true);
        await updateProfile({ full_name: trimmed });
        setSavingName(false);
        setEditingName(false);
    }

    if (loading) return <div className="student-loading">Cargando perfil...</div>;

    return (
        <div className="layout">
            {/* Mobile overlay */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* SIDEBAR */}
            <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="logo-container">
                    <img
                        src={`${BASE}images/logo eco final.png`}
                        alt="ECO Logo"
                        className="logo"
                        style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }}
                    />
                </div>
                <div className="user-profile">
                    <div className="avatar">
                        <img src={profile?.avatar_url || `${BASE}images/teens-worshipping.png`} alt="Avatar" />
                    </div>
                    {editingName ? (
                        <div className="edit-name-container">
                            <input
                                className="edit-name-input"
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                                autoFocus
                                maxLength={60}
                                placeholder="Tu nombre"
                            />
                            <div className="edit-name-actions">
                                <button className="edit-name-save" onClick={saveName} disabled={savingName}>
                                    {savingName ? '...' : 'Guardar'}
                                </button>
                                <button className="edit-name-cancel" onClick={() => setEditingName(false)}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="user-name-row">
                            <p className="user-name">{profile?.full_name || 'Estudiante'}</p>
                            <button className="edit-name-btn" onClick={startEditName} title="Editar nombre">
                                &#9998;
                            </button>
                        </div>
                    )}
                </div>
                <ul className="nav-links">
                    <li>
                        <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">🏠</span> Inicio
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard/modules" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">📚</span> Módulos
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard/achievements" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">🏆</span> Logros
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard/attendance" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">✋</span> Asistencia
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard/notifications" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">🔔</span> Notificaciones
                            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                        </NavLink>
                    </li>
                </ul>
                <div className="nav-bottom">
                    {['admin', 'mentor'].includes(profile?.role) && (
                        <Link to="/admin" className="admin-link">
                            {profile?.role === 'admin' ? 'Panel Admin' : 'Panel Mentor'}
                        </Link>
                    )}
                    <button onClick={() => signOut({ redirectUrl: BASE })} className="logout-btn">
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* TOPBAR with hamburger + bell */}
                <header className="topbar">
                    <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                    </button>

                    <div className="topbar-right" ref={bellRef}>
                        <button className="bell-btn" onClick={() => setShowBell(v => !v)} aria-label="Notificaciones">
                            🔔
                            {unreadCount > 0 && (
                                <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            )}
                        </button>

                        {showBell && (
                            <div className="bell-popup">
                                <div className="bell-popup-header">
                                    <span>Notificaciones</span>
                                    {unreadCount > 0 && (
                                        <span className="bell-popup-count">{unreadCount} nuevas</span>
                                    )}
                                </div>
                                <div className="bell-popup-body">
                                    {recentNotifs.length === 0 ? (
                                        <p className="bell-popup-empty">Sin notificaciones nuevas</p>
                                    ) : (
                                        recentNotifs.map(n => (
                                            <button
                                                type="button"
                                                key={n.id}
                                                className="bell-popup-item"
                                                onClick={() => openNotif(n)}
                                                title="Marcar como leída"
                                            >
                                                <span className="bell-item-icon">{TYPE_ICON[n.type] || '📌'}</span>
                                                <div className="bell-item-body">
                                                    <p className="bell-item-title">{n.title}</p>
                                                    <span className="bell-item-time">{timeAgo(n.created_at)}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                                <button className="bell-popup-footer" onClick={goToAllNotifs}>
                                    Ver todas las notificaciones →
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
