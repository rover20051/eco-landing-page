import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AdminDashboard.css'; // Reutilizamos estilos de tabla

export default function UserManager() {
    const supabase = useSupabase();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        let isMounted = true;
        async function loadUsers() {
            try {
                setLoading(true);
                // We fetch profiles and count their completed lessons & submitted tasks
                const { data, error } = await supabase
                    .from('profiles')
                    .select(`
            id, full_name, role, eco_points,
            lesson_progress(count),
            assignments(count)
          `)
                    .order('full_name', { ascending: true });

                if (error) throw error;
                if (isMounted) setUsers(data || []);
            } catch (err) {
                console.error('Error loading users:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadUsers();
        return () => { isMounted = false; };
    }, [supabase]);

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="admin-loading">Cargando usuarios...</div>;

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

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Puntos ECO</th>
                            <th>Lecciones Vistas</th>
                            <th>Tareas Enviadas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td style={{ fontWeight: 600 }}>{user.full_name}</td>
                                <td>
                                    <span className={`role-badge ${user.role}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>{user.eco_points}</td>
                                <td>{user.lesson_progress?.[0]?.count || 0}</td>
                                <td>{user.assignments?.[0]?.count || 0}</td>
                                <td>
                                    {/* Future actions: View detail, Edit points, Change Role */}
                                    <button className="eco-secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Ver Perfil</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="admin-empty-state">No se encontraron usuarios.</div>
                )}
            </div>
        </div>
    );
}
