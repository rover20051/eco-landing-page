import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { useUserProfile } from '../../hooks/useSupabase';
import './AdminApp.css';

const BASE = import.meta.env.BASE_URL;

export default function AdminApp() {
    const { signOut } = useClerk();
    const { profile, loading } = useUserProfile();

    if (loading) return <div className="admin-loading">Cargando...</div>;

    return (
        <div className="layout admin-layout">
            {/* SIDEBAR */}
            <nav className="sidebar admin-sidebar">
                <div className="logo-container">
                    <img
                        src={`${BASE}images/logo eco final.png`}
                        alt="ECO Logo"
                        className="logo"
                        style={{ width: '100%', height: 'auto', filter: 'brightness(0) invert(1)' }}
                    />
                </div>

                <div className="user-profile">
                    <p className="user-name">{profile?.full_name || 'ECO Staff'}</p>
                    <span className="admin-badge">
                        {profile?.role === 'admin' ? 'Panel de Admin' : 'Panel de Mentor'}
                    </span>
                </div>

                <ul className="nav-links">
                    <li>
                        <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">📊</span> Dashboard
                        </NavLink>
                    </li>
                    {profile?.role === 'admin' && (
                        <>
                            <li>
                                <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                                    <span className="nav-icon">👥</span> Usuarios
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/admin/modules" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                                    <span className="nav-icon">📚</span> Módulos
                                </NavLink>
                            </li>
                        </>
                    )}
                    <li>
                        <NavLink to="/admin/assignments" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">📝</span> Entregas
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/admin/attendance" className={({ isActive }) => isActive ? 'nav-active' : ''}>
                            <span className="nav-icon">✋</span> Asistencias
                        </NavLink>
                    </li>
                </ul>

                <div className="nav-bottom">
                    <Link to="/dashboard" className="student-link">← Volver al Campus</Link>
                    <button onClick={() => signOut({ redirectUrl: BASE })} className="logout-btn">
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main className="main-content">
                <header className="topbar admin-topbar">
                    <div className="admin-topbar-brand">
                        <span className="admin-topbar-title">
                            {profile?.role === 'admin' ? 'Administración' : 'Tutorías'}
                        </span>
                        <span className="admin-topbar-sub">ECO Campus</span>
                    </div>
                </header>
                <div className="content-container admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
