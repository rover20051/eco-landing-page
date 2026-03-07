import React, { useEffect, useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { useUserProfile } from '../hooks/useSupabase';
import { useSupabase } from '../contexts/SupabaseContext';
import './StudentApp.css';

const BASE = import.meta.env.BASE_URL;

export default function StudentApp() {
    const { signOut } = useClerk();
    const { profile, loading } = useUserProfile();
    const supabase = useSupabase();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!profile) return;
        async function fetchUnread() {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', profile.id)
                .eq('is_read', false);
            setUnreadCount(count || 0);
        }
        fetchUnread();
    }, [profile, supabase]);

    if (loading) {
        return <div className="student-loading">Cargando perfil...</div>;
    }

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
                        <img
                            src={profile?.avatar_url || `${BASE}images/teens-worshipping.png`}
                            alt="Avatar"
                        />
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
                            {unreadCount > 0 && (
                                <span className="notif-badge">{unreadCount}</span>
                            )}
                        </NavLink>
                    </li>
                </ul>
                <div className="nav-bottom">
                    {profile?.role === 'admin' && (
                        <Link to="/admin" className="admin-link">Panel Admin</Link>
                    )}
                    <button onClick={() => signOut({ redirectUrl: '/' })} className="logout-btn">
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
