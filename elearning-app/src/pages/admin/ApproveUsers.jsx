import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './ApproveUsers.css';

export default function ApproveUsers() {
    const supabase = useSupabase();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('pending'); // 'pending' | 'all'
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadUsers();
    }, [supabase]);

    async function loadUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, status, created_at')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPendingUsers(data.filter(u => u.status === 'pending'));
            setAllUsers(data);
        } else if (error) {
            console.error("Supabase Error fetching users:", error);
            alert("Error cargando usuarios: " + error.message);
        }
        setLoading(false);
    }

    async function updateStatus(userId, newStatus, newRole = null) {
        const updates = { status: newStatus };
        if (newRole) updates.role = newRole;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (!error) {
            loadUsers();
        }
    }

    async function deleteUser(userId, userName) {
        const confirmed = window.confirm(
            `¿Eliminar completamente al usuario "${userName}"?\n\nEsto borrará su perfil, progreso, tareas y todos sus datos. Esta acción no se puede deshacer.`
        );
        if (!confirmed) return;

        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            loadUsers();
        }
    }

    const displayed = (view === 'pending' ? pendingUsers : allUsers).filter(u =>
        !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (status) => {
        const map = { pending: '⏳ Pendiente', approved: '✅ Aprobado', rejected: '❌ Rechazado' };
        return map[status] || status;
    };

    const roleBadge = (role) => {
        const map = { student: '🎓 Alumno', mentor: '👨‍🏫 Mentor', admin: '🛡 Admin' };
        return map[role] || role;
    };

    return (
        <div className="approve-users">
            <div className="approve-header">
                <h2>Gestión de Usuarios</h2>
                {pendingUsers.length > 0 && (
                    <span className="pending-badge">{pendingUsers.length} pendiente{pendingUsers.length > 1 ? 's' : ''}</span>
                )}
            </div>

            <div className="approve-controls">
                <div className="view-tabs">
                    <button
                        className={`tab-btn ${view === 'pending' ? 'active' : ''}`}
                        onClick={() => setView('pending')}
                    >
                        ⏳ Pendientes ({pendingUsers.length})
                    </button>
                    <button
                        className={`tab-btn ${view === 'all' ? 'active' : ''}`}
                        onClick={() => setView('all')}
                    >
                        👥 Todos ({allUsers.length})
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="search-input"
                />
            </div>

            {loading ? (
                <div className="loading-msg">Cargando usuarios...</div>
            ) : displayed.length === 0 ? (
                <div className="empty-msg">
                    {view === 'pending' ? '¡No hay usuarios pendientes! 🎉' : 'No se encontraron usuarios.'}
                </div>
            ) : (
                <div className="users-list">
                    {displayed.map(user => (
                        <div key={user.id} className={`user-card ${user.status}`}>
                            <div className="user-info">
                                <div className="user-avatar">{((user.full_name && user.full_name[0]) || '?').toUpperCase()}</div>
                                <div className="user-details">
                                    <strong>{user.full_name || 'Sin nombre'}</strong>
                                    <div className="user-badges">
                                        <span className="badge status-badge">{statusBadge(user.status)}</span>
                                        <span className="badge role-badge">{roleBadge(user.role)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="user-actions">
                                {user.status === 'pending' && (
                                    <>
                                        <button
                                            className="approve-btn"
                                            onClick={() => updateStatus(user.id, 'approved')}
                                        >
                                            ✅ Aprobar
                                        </button>
                                        <button
                                            className="approve-btn mentor-btn"
                                            onClick={() => updateStatus(user.id, 'approved', 'mentor')}
                                        >
                                            👨‍🏫 Aprobar como Mentor
                                        </button>
                                        <button
                                            className="reject-btn"
                                            onClick={() => updateStatus(user.id, 'rejected')}
                                        >
                                            ❌ Rechazar
                                        </button>
                                    </>
                                )}
                                {user.status !== 'pending' && (
                                    <button
                                        className="reset-btn"
                                        onClick={() => updateStatus(user.id, 'pending')}
                                    >
                                        🔄 Reset
                                    </button>
                                )}
                                {user.status === 'approved' && user.role !== 'admin' && (
                                    <select
                                        className="role-select"
                                        value={user.role}
                                        onChange={e => updateStatus(user.id, 'approved', e.target.value)}
                                    >
                                        <option value="student">🎓 Alumno</option>
                                        <option value="mentor">👨‍🏫 Mentor</option>
                                        <option value="admin">🛡 Admin</option>
                                    </select>
                                )}
                                {user.role !== 'admin' && (
                                    <button
                                        className="reject-btn"
                                        style={{ background: '#7f1d1d', marginLeft: '4px' }}
                                        onClick={() => deleteUser(user.id, user.full_name)}
                                    >
                                        🗑 Eliminar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
