import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
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
    const { profile, loading } = useUserProfile();
    const supabase = useSupabase();
    const navigate = useNavigate();

    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifs, setRecentNotifs] = useState([]);
    const [showBell, setShowBell] = useState(false);
    const bellRef = useRef(null);

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
        function handler(e) {
            if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    async function markAndGo() {
        if (profile && unreadCount > 0) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
            setUnreadCount(0);
            setRecentNotifs([]);
        }
        setShowBell(false);
        navigate('/dashboard/notifications');
    }

    if (loading) return <div className="student-loading">Cargando perfil...</div>;

    return (
        <div className="layout">
            {/* SIDEBAR */}
            <nav className="sidebar">
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
                    <p className="user-name">{profile?.full_name || 'Estudiante'}</p>
                    <div className="user-stats">
                        <span>⚡ {profile?.current_streak || 0} días</span>
                        <span>⭐ {profile?.eco_points || 0} pts</span>
                    </div>
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
                {/* TOPBAR with bell */}
                <header className="topbar">
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
                                            <div key={n.id} className="bell-popup-item">
                                                <span className="bell-item-icon">{TYPE_ICON[n.type] || '📌'}</span>
                                                <div className="bell-item-body">
                                                    <p className="bell-item-title">{n.title}</p>
                                                    <span className="bell-item-time">{timeAgo(n.created_at)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button className="bell-popup-footer" onClick={markAndGo}>
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
