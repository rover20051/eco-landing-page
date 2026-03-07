import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { useUserProfile } from '../hooks/useSupabase';
import './StudentApp.css';

export default function StudentApp() {
    const { signOut } = useClerk();
    const { profile, loading } = useUserProfile();

    if (loading) {
        return <div className="student-loading">Cargando perfil...</div>;
    }

    return (
        <div className="layout">
            {/* SIDEBAR */}
            <nav className="sidebar">
                <div className="logo-container" style={{ padding: '0 20px', marginBottom: '30px' }}>
                    <img src="/images/logo eco final.png" alt="ECO Logo" className="logo" style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }} />
                </div>
                <div className="user-profile">
                    <div className="avatar">
                        <img src={profile?.avatar_url || '/images/teens-worshipping.png'} alt="Avatar" />
                    </div>
                    <p className="user-name">{profile?.full_name || 'Estudiante'}</p>
                    <div className="user-stats">
                        <span>⚡ Racha: {profile?.current_streak || 0} Días</span>
                        <span>⭐ Puntos: {profile?.eco_points || 0}</span>
                    </div>
                </div>
                <ul className="nav-links">
                    <li><Link to="/dashboard">Inicio</Link></li>
                    <li><Link to="/dashboard/modules">Módulos</Link></li>
                    <li><Link to="/dashboard/achievements">Logros</Link></li>
                    <li><Link to="/dashboard/notifications">Notificaciones</Link></li>
                </ul>
                <div className="nav-bottom">
                    {profile?.role === 'admin' && (
                        <Link to="/admin" className="admin-link">Ir a Panel Admin</Link>
                    )}
                    <button onClick={() => signOut()} className="logout-btn">
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                <header className="topbar">
                    {/* Empty topbar for spacing and cleanliness, or breadcrumbs later */}
                </header>

                <div className="content-container">
                    {/* Aquí se renderizan los hijos (Dashboard, Modules, etc) */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
