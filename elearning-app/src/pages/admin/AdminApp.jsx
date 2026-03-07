import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { useUserProfile } from '../../hooks/useSupabase';
import './AdminApp.css'; // Will share some base styles with StudentApp

export default function AdminApp() {
    const { signOut } = useClerk();
    const { profile, loading } = useUserProfile();

    if (loading) {
        return <div className="admin-loading">Cargando perfil administrador...</div>;
    }

    return (
        <div className="layout admin-layout">
            {/* SIDEBAR */}
            <nav className="sidebar admin-sidebar">
                <div className="logo-container" style={{ padding: '0 20px', marginBottom: '30px' }}>
                    <img src="/images/logo eco final.png" alt="ECO Logo" className="logo" style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }} />
                </div>

                <div className="user-profile">
                    <p className="user-name">{profile?.full_name || 'Administrador'}</p>
                    <span className="admin-badge">Panel de Control</span>
                </div>

                <ul className="nav-links">
                    <li><Link to="/admin">Dashboard</Link></li>
                    <li><Link to="/admin/users">🔔 Usuarios & Aprobaciones</Link></li>
                    <li><Link to="/admin/modules">Módulos</Link></li>
                    <li><Link to="/admin/assignments">Entregas</Link></li>
                    <li><Link to="/admin/attendance">Asistencias</Link></li>
                </ul>

                <div className="nav-bottom">
                    <Link to="/dashboard" className="student-link">Volver al Campus</Link>
                    <button onClick={() => signOut()} className="logout-btn">
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-title">Administración ECO</div>
                </header>

                <div className="content-container admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
