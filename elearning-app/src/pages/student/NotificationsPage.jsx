import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import './NotificationsPage.css';

const TYPE_META = {
    class_unlocked: { icon: '🔓', label: 'Clase desbloqueada', color: '#112F4E' },
    assignment_graded: { icon: '📝', label: 'Tarea devuelta', color: '#BD4339' },
    attendance: { icon: '✋', label: 'Asistencia', color: '#2E7D32' },
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

export default function NotificationsPage() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!profile) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50);
        setNotifications(data || []);
        setLoading(false);
    }, [profile, supabase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    async function markAllRead() {
        if (!profile) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', profile.id)
            .eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    async function markRead(id) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }

    const unread = notifications.filter(n => !n.is_read);

    if (loading) return <div className="dashboard-loading">Cargando notificaciones...</div>;

    return (
        <div className="notifications-page">
            <div className="notif-header">
                <div>
                    <h1 className="page-title">Notificaciones</h1>
                    <p className="page-subtitle">
                        {unread.length > 0
                            ? `Tenés ${unread.length} sin leer`
                            : 'Todo al día'}
                    </p>
                </div>
                {unread.length > 0 && (
                    <button className="mark-all-btn" onClick={markAllRead}>
                        Marcar todo como leído
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="notif-empty">
                    <span className="notif-empty-icon">🔔</span>
                    <p>No tenés notificaciones todavía.</p>
                    <p className="notif-empty-sub">Te avisaremos cuando se desbloquee una clase, cuando el admin devuelva una tarea o cuando registren tu asistencia.</p>
                </div>
            ) : (
                <div className="notif-list">
                    {notifications.map(n => {
                        const meta = TYPE_META[n.type] || { icon: '📌', label: n.type, color: '#112F4E' };
                        return (
                            <div
                                key={n.id}
                                className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                                onClick={() => !n.is_read && markRead(n.id)}
                            >
                                <div className="notif-icon-wrap" style={{ backgroundColor: `${meta.color}18` }}>
                                    <span className="notif-type-icon">{meta.icon}</span>
                                </div>
                                <div className="notif-body">
                                    <span className="notif-type-label" style={{ color: meta.color }}>{meta.label}</span>
                                    <p className="notif-title">{n.title}</p>
                                    {n.message && <p className="notif-message">{n.message}</p>}
                                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                                </div>
                                {!n.is_read && <div className="notif-dot" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
