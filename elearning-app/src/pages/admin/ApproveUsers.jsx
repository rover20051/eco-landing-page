import React, { useEffect, useState } from 'react';
import { useSession } from '@clerk/react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton, useToast } from '../../components/Toast';
import './ApproveUsers.css';

export default function ApproveUsers() {
    const supabase = useSupabase();
    const toast = useToast();
    const { session } = useSession();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('pending'); // 'pending' | 'all'
    const [search, setSearch] = useState('');
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    async function loadUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, status, created_at')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLoadError(false);
            setPendingUsers(data.filter(u => u.status === 'pending'));
            setAllUsers(data);
        } else if (error) {
            console.error("Supabase Error fetching users:", error);
            setLoadError(true);
            toast.error('No pudimos cargar la lista de usuarios.');
        }
        setLoading(false);
    }

    const STATUS_MSG = {
        approved: 'Usuario aprobado.',
        rejected: 'Usuario rechazado.',
        pending: 'Usuario vuelto a pendiente.'
    };

    const ROLE_MSG = { mentor: 'mentor', admin: 'admin', student: 'alumno' };

    async function updateStatus(userId, newStatus, newRole = null) {
        const updates = { status: newStatus };
        if (newRole) updates.role = newRole;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating profile status:', error);
            toast.error('No pudimos actualizar a este usuario. Intentá de nuevo.');
            return;
        }

        toast.success(
            newRole
                ? `Listo, ahora es ${ROLE_MSG[newRole] || newRole}.`
                : (STATUS_MSG[newStatus] || 'Usuario actualizado.')
        );
        loadUsers();
    }

    async function deleteUser(userId, userName) {
        const confirmed = await toast.confirm(
            `¿Eliminar completamente a "${userName || 'este usuario'}"? Se borra su perfil, progreso, tareas y todos sus datos. No se puede deshacer.`,
            { okLabel: 'Eliminar', cancelLabel: 'Cancelar' }
        );
        if (!confirmed) return;

        // Step 1: Delete from Supabase directly (RLS allows admins)
        const { error: dbError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (dbError) {
            console.error('Error deleting profile:', dbError);
            toast.error('No pudimos eliminar a este usuario.');
            return;
        }

        // Step 2: Try to delete from Clerk via edge function (best effort)
        try {
            const token = await session?.getToken({ template: 'supabase' });
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ userId }),
            });
        } catch {
            // Clerk deletion failed silently — user is already removed from Supabase
        }

        toast.success(`Usuario "${userName || 'sin nombre'}" eliminado correctamente.`);
        loadUsers();
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
                <div className="users-list">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="user-card">
                            <Skeleton lines={2} height={18} />
                        </div>
                    ))}
                </div>
            ) : loadError ? (
                <div className="admin-error-banner">
                    <span>No pudimos cargar la lista de usuarios.</span>
                    <button className="eco-secondary-btn" onClick={loadUsers}>Reintentar</button>
                </div>
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
