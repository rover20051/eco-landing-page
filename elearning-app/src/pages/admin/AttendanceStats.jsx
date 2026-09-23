import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton } from '../../components/Toast';
import './AdminDashboard.css';
import './AttendanceStats.css';

/* Trae todas las filas paginando de a 1000 (límite por defecto de Supabase). */
async function fetchAllRows(build) {
    const PAGE = 1000;
    let from = 0;
    const out = [];
    for (; ;) {
        const { data, error } = await build().range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return out;
}

function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function AttendanceStats() {
    const supabase = useSupabase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [tab, setTab] = useState('alumnos');

    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState([]);

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                setError(false);

                const [profilesRes, attendanceRows] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, full_name')
                        .eq('status', 'approved')
                        .neq('role', 'admin')
                        .order('full_name', { ascending: true }),
                    fetchAllRows(() => supabase
                        .from('attendance')
                        .select('user_id, event_date, status'))
                ]);

                if (profilesRes.error) throw profilesRes.error;
                if (!isMounted) return;

                setStudents(profilesRes.data || []);
                setRecords(attendanceRows);
            } catch (err) {
                console.error('Error cargando las estadísticas de asistencia:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => { isMounted = false; };
    }, [supabase, reloadToken]);

    const byStudent = useMemo(() => {
        const acc = new Map();
        records.forEach(r => {
            const cur = acc.get(r.user_id) || { present: 0, absent: 0, excused: 0, total: 0 };
            cur.total += 1;
            if (r.status === 'present') cur.present += 1;
            else if (r.status === 'excused') cur.excused += 1;
            else cur.absent += 1;
            acc.set(r.user_id, cur);
        });

        return students
            .map(s => {
                const c = acc.get(s.id) || { present: 0, absent: 0, excused: 0, total: 0 };
                return {
                    ...s,
                    ...c,
                    percent: c.total > 0 ? Math.round((c.present / c.total) * 100) : null
                };
            })
            .sort((a, b) => {
                if (a.percent === null && b.percent === null) return (a.full_name || '').localeCompare(b.full_name || '');
                if (a.percent === null) return 1;
                if (b.percent === null) return -1;
                return a.percent - b.percent;
            });
    }, [students, records]);

    const byDate = useMemo(() => {
        const acc = new Map();
        records.forEach(r => {
            const cur = acc.get(r.event_date) || { present: 0, absent: 0, excused: 0, total: 0 };
            cur.total += 1;
            if (r.status === 'present') cur.present += 1;
            else if (r.status === 'excused') cur.excused += 1;
            else cur.absent += 1;
            acc.set(r.event_date, cur);
        });
        return [...acc.entries()]
            .map(([date, c]) => ({
                date,
                ...c,
                percent: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0
            }))
            .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }, [records]);

    const global = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        return {
            total,
            present,
            percent: total > 0 ? Math.round((present / total) * 100) : null,
            encuentros: byDate.length
        };
    }, [records, byDate]);

    if (loading) {
        return (
            <div className="as-page">
                <h1 className="admin-page-title">Estadísticas de asistencia</h1>
                <div className="as-card"><Skeleton lines={7} height={18} /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="as-page">
                <h1 className="admin-page-title">Estadísticas de asistencia</h1>
                <div className="admin-error-banner">
                    <span>No pudimos cargar las estadísticas de asistencia.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="as-page">
                <h1 className="admin-page-title">Estadísticas de asistencia</h1>
                <div className="admin-empty-state">
                    Todavía no hay asistencias registradas. Cargá el primer encuentro desde Asistencias y acá vas a ver el resumen.
                </div>
            </div>
        );
    }

    return (
        <div className="as-page">
            <h1 className="admin-page-title" style={{ marginBottom: 8 }}>Estadísticas de asistencia</h1>
            <p className="as-subtitle">
                {global.encuentros} encuentro{global.encuentros === 1 ? '' : 's'} registrado{global.encuentros === 1 ? '' : 's'} ·
                {' '}asistencia general del {global.percent ?? 0}%
            </p>

            <div className="as-tabs">
                <button
                    className={`as-tab ${tab === 'alumnos' ? 'is-active' : ''}`}
                    onClick={() => setTab('alumnos')}
                >
                    Por alumno
                </button>
                <button
                    className={`as-tab ${tab === 'fechas' ? 'is-active' : ''}`}
                    onClick={() => setTab('fechas')}
                >
                    Por fecha
                </button>
            </div>

            {tab === 'alumnos' && (
                <div className="as-card">
                    {byStudent.length === 0 ? (
                        <div className="admin-empty-state">No hay alumnos aprobados todavía.</div>
                    ) : (
                        <ul className="as-student-list">
                            {byStudent.map(s => (
                                <li key={s.id} className="as-student-row">
                                    <Link to={`/admin/students/${s.id}`} className="as-student-name">
                                        {s.full_name || 'Sin nombre'}
                                    </Link>
                                    <div className="as-bar">
                                        <div
                                            className={`as-bar-fill ${levelClass(s.percent)}`}
                                            style={{ width: `${s.percent ?? 0}%` }}
                                        />
                                    </div>
                                    <span className="as-student-pct">
                                        {s.percent === null ? '—' : `${s.percent}%`}
                                    </span>
                                    <span className="as-student-detail">
                                        {s.total === 0
                                            ? 'sin registros'
                                            : `${s.present} presentes · ${s.absent} ausentes · ${s.excused} justificadas`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {tab === 'fechas' && (
                <div className="as-card">
                    <ul className="as-date-list">
                        {byDate.map(d => (
                            <li key={d.date} className="as-date-row">
                                <div className="as-date-head">
                                    <span className="as-date-label">{formatDate(d.date)}</span>
                                    <span className={`as-date-pct ${levelClass(d.percent)}`}>{d.percent}%</span>
                                </div>
                                <div className="as-stacked">
                                    {d.present > 0 && (
                                        <div
                                            className="as-seg as-seg--present"
                                            style={{ width: `${(d.present / d.total) * 100}%` }}
                                            title={`${d.present} presentes`}
                                        />
                                    )}
                                    {d.excused > 0 && (
                                        <div
                                            className="as-seg as-seg--excused"
                                            style={{ width: `${(d.excused / d.total) * 100}%` }}
                                            title={`${d.excused} justificadas`}
                                        />
                                    )}
                                    {d.absent > 0 && (
                                        <div
                                            className="as-seg as-seg--absent"
                                            style={{ width: `${(d.absent / d.total) * 100}%` }}
                                            title={`${d.absent} ausentes`}
                                        />
                                    )}
                                </div>
                                <div className="as-date-counts">
                                    <span><i className="as-dot as-dot--present" /> {d.present} presentes</span>
                                    <span><i className="as-dot as-dot--absent" /> {d.absent} ausentes</span>
                                    <span><i className="as-dot as-dot--excused" /> {d.excused} justificadas</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function levelClass(percent) {
    if (percent === null || percent === undefined) return 'is-none';
    if (percent >= 80) return 'is-high';
    if (percent >= 50) return 'is-mid';
    return 'is-low';
}
