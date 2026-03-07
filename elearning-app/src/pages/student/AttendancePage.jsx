import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import './AttendancePage.css';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const STATUS_LABEL = {
    present: 'Presente',
    absent: 'Ausente',
    excused: 'Justificada',
};

const STATUS_CLASS = {
    present: 'att-present',
    absent: 'att-absent',
    excused: 'att-excused',
};

export default function AttendancePage() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (!profile) return;
        let isMounted = true;

        async function fetchAttendance() {
            const { data } = await supabase
                .from('attendance')
                .select('event_date, status, notes')
                .eq('user_id', profile.id)
                .gte('event_date', `${currentYear}-01-01`)
                .lte('event_date', `${currentYear}-12-31`)
                .order('event_date', { ascending: false });

            if (isMounted) {
                setRecords(data || []);
                setLoading(false);
            }
        }

        fetchAttendance();
        return () => { isMounted = false; };
    }, [profile, supabase, currentYear]);

    if (loading) return <div className="dashboard-loading">Cargando asistencia...</div>;

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const monthRecords = records.filter(r => {
        const d = new Date(r.event_date + 'T00:00:00');
        return d.getMonth() === selectedMonth;
    });

    const availableMonths = [...new Set(
        records.map(r => new Date(r.event_date + 'T00:00:00').getMonth())
    )].sort((a, b) => b - a);

    return (
        <div className="attendance-page">
            <h1 className="page-title">Mi Asistencia</h1>
            <p className="page-subtitle">Resumen global {currentYear}</p>

            {/* Global stats */}
            <div className="att-stats-row">
                <div className="att-stat-card att-stat-card--main">
                    <div className="att-percentage-ring">
                        <svg viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" className="ring-bg" />
                            <circle
                                cx="60" cy="60" r="50"
                                className="ring-fill"
                                strokeDasharray={`${percentage * 3.14} 314`}
                                transform="rotate(-90 60 60)"
                            />
                        </svg>
                        <div className="att-percentage-label">
                            <span className="att-pct-num">{percentage}%</span>
                            <span className="att-pct-sub">asistencia</span>
                        </div>
                    </div>
                    <div className="att-totals">
                        <div className="att-total-row">
                            <span className="att-dot att-dot--present" />
                            <span>Presente</span>
                            <strong>{present}</strong>
                        </div>
                        <div className="att-total-row">
                            <span className="att-dot att-dot--absent" />
                            <span>Ausente</span>
                            <strong>{absent}</strong>
                        </div>
                        <div className="att-total-row">
                            <span className="att-dot att-dot--excused" />
                            <span>Justificada</span>
                            <strong>{excused}</strong>
                        </div>
                        <div className="att-total-divider" />
                        <div className="att-total-row">
                            <span>Total registros</span>
                            <strong>{total}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Month filter */}
            <div className="att-month-section">
                <h2 className="section-heading">Detalle por mes</h2>
                {availableMonths.length > 0 ? (
                    <div className="att-month-tabs">
                        {availableMonths.map(m => (
                            <button
                                key={m}
                                className={`att-month-tab ${selectedMonth === m ? 'att-month-tab--active' : ''}`}
                                onClick={() => setSelectedMonth(m)}
                            >
                                {MONTH_NAMES[m]}
                            </button>
                        ))}
                    </div>
                ) : null}

                {monthRecords.length === 0 ? (
                    <div className="att-empty">
                        <p>Sin registros en {MONTH_NAMES[selectedMonth]}.</p>
                    </div>
                ) : (
                    <div className="att-records-list">
                        {monthRecords.map((r, i) => {
                            const d = new Date(r.event_date + 'T00:00:00');
                            return (
                                <div key={i} className={`att-record-item ${STATUS_CLASS[r.status]}`}>
                                    <div className="att-record-date">
                                        <span className="att-record-day">
                                            {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                                        </span>
                                        <span className="att-record-num">
                                            {d.getDate()} {MONTH_NAMES[d.getMonth()]}
                                        </span>
                                    </div>
                                    <span className={`att-record-status att-badge--${r.status}`}>
                                        {STATUS_LABEL[r.status] || r.status}
                                    </span>
                                    {r.notes && (
                                        <span className="att-record-notes">{r.notes}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
