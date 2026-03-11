import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const supabase = useSupabase();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeModules: 0,
        pendingGrades: 0
    });
    const [recentAssignments, setRecentAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadAdminData() {
            try {
                setLoading(true);

                // 1. Fetch Global Stats
                const [usersRes, modulesRes, gradesRes] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
                    supabase.from('modules').select('id', { count: 'exact', head: true }).eq('is_active', true),
                    supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'submitted')
                ]);

                if (isMounted) {
                    setStats({
                        totalUsers: usersRes.count || 0,
                        activeModules: modulesRes.count || 0,
                        pendingGrades: gradesRes.count || 0
                    });
                }

                // 2. Fetch Recent Ungraded Assignments
                const { data: assignmentsData } = await supabase
                    .from('assignments')
                    .select(`
            id, 
            status, 
            submitted_at, 
            profiles!user_id(full_name),
            lessons (title, modules(module_number))
          `)
                    .eq('status', 'submitted')
                    .order('submitted_at', { ascending: false })
                    .limit(5);

                if (isMounted && assignmentsData) setRecentAssignments(assignmentsData);

            } catch (err) {
                console.error('Error loading admin dashboard:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadAdminData();
        return () => { isMounted = false; };
    }, [supabase]);

    if (loading) return <div className="admin-loading">Cargando métricas...</div>;

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
