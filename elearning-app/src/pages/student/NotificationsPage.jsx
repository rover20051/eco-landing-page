import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import './NotificationsPage.css';

const TYPE_META = {
    class_unlocked:   { icon: '🔓', label: 'Clase desbloqueada', color: '#112F4E' },
    assignment_graded: { icon: '📝', label: 'Tarea devuelta',     color: '#BD4339' },
    attendance:        { icon: '✋', label: 'Asistencia',          color: '#2E7D32' },
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
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch and immediately mark all as read when entering the page
    useEffect(() => {
        if (!profile) return;
        let isMounted = true;

        async function fetchAndMarkRead() {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!isMounted) return;
            setNotifications((data || []).map(n => ({ ...n, is_read: true })));
            setLoading(false);

            // Mark all unread ones as read in the DB
            const hasUnread = (data || []).some(n => !n.is_read);
            if (hasUnread) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', profile.id)
                    .eq('is_read', false);
            }
        }

        fetchAndMarkRead();
        return () => { isMounted = false; };
    }, [profile, supabase]);

    // Navigate to the relevant lesson when clicking a notification
    async function handleNotifClick(n) {
        const isAssignment = n.type === 'assignment_graded';
        const suffix = isAssignment ? '?scroll=assignment' : '';

        // Case 1: lesson_id already in data (new notifications)
        if (n.data?.lesson_id) {
            navigate(`/dashboard/lesson/${n.data.lesson_id}${suffix}`);
            return;
        }
        // Case 2: only assignment_id (old notifications) → look up lesson_id
        if (isAssignment && n.data?.assignment_id) {
            const { data } = await supabase
                .from('assignments')
                .select('lesson_id')
                .eq('id', n.data.assignment_id)
                .single();
            if (data?.lesson_id) {
                navigate(`/dashboard/lesson/${data.lesson_id}${suffix}`);
            }
        }
    }

    function getIsClickable(n) {
        if (n.type === 'assignment_graded') return !!(n.data?.lesson_id || n.data?.assignment_id);
        if (n.type === 'class_unlocked') return !!n.data?.lesson_id;
        return false;
    }

    if (loading) return <div className="dashboard-loading">Cargando notificaciones...</div>;

    return (
        <div className="notifications-page">
            <div className="notif-header">
                <div>
                    <h1 className="page-title">Notificaciones</h1>
                    <p className="page-subtitle">Todo al día</p>
                </div>
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
                        const clickable = getIsClickable(n);
                        return (
                            <div
                                key={n.id}
                                className={`notif-item ${clickable ? 'notif-item--clickable' : ''}`}
                                onClick={clickable ? () => handleNotifClick(n) : undefined}
                                title={clickable ? 'Ir a la clase' : undefined}
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
                                {clickable && (
                                    <div className="notif-arrow">›</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
