import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AttendanceManager.css';

const ROLE_LABELS = {
    student: 'Alumno',
    mentor: 'Mentor',
    admin: 'Admin',
};

const ROLE_COLORS = {
    student: { background: '#e8f4fd', color: '#1565c0' },
    mentor: { background: '#e8f5e9', color: '#2e7d32' },
    admin: { background: '#fce4ec', color: '#c62828' },
};

export default function AttendanceManager() {
    const supabase = useSupabase();

    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // { "user_id": { status: "present"|"absent"|"excused", notes: "" } }
    const [attendanceRecord, setAttendanceRecord] = useState({});
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadAttendanceData() {
            setLoading(true);
            setFetchError(null);
            try {
                // 1. Fetch ALL participants (students, mentors, admins) except rejected
                const { data: usersData, error: usersError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role, status')
                    .neq('status', 'rejected')
                    .order('role', { ascending: true })
                    .order('full_name', { ascending: true });

                if (usersError) throw usersError;

                // 2. Fetch existing attendance records for the selected date
                const { data: attData, error: attError } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('event_date', selectedDate);

                if (attError) throw attError;

                if (isMounted) {
                    setParticipants(usersData || []);

                    const recordMap = {};
                    (attData || []).forEach(record => {
                        recordMap[record.user_id] = {
                            status: record.status,
                            notes: record.notes || ''
                        };
                    });
                    setAttendanceRecord(recordMap);
                }

            } catch (err) {
                console.error('Error fetching attendance:', err);
                if (isMounted) setFetchError(err.message || 'Error desconocido al cargar alumnos.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadAttendanceData();
        return () => { isMounted = false; };

    }, [supabase, selectedDate]);

    const handleStatusChange = (userId, status) => {
        setAttendanceRecord(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                status,
            }
        }));
    };

    const handleNotesChange = (userId, value) => {
        setAttendanceRecord(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                notes: value
            }
        }));
    };

    // Marks EVERYONE as present (overwrites any existing status) and auto-saves
    const handleCrearClase = async () => {
        if (participants.length === 0) {
            alert('No hay participantes registrados en el sistema.');
            return;
        }

        // Build new record with everyone as present
        const newRecord = {};
        participants.forEach(p => {
            newRecord[p.id] = { status: 'present', notes: attendanceRecord[p.id]?.notes || '' };
        });

        setAttendanceRecord(newRecord);

        try {
            setSaving(true);
            const recordsToSave = participants.map(p => ({
                user_id: p.id,
                event_date: selectedDate,
                status: 'present',
                notes: attendanceRecord[p.id]?.notes || null
            }));

            const { error } = await supabase
                .from('attendance')
                .upsert(recordsToSave, { onConflict: 'user_id,event_date' });

            if (error) throw error;

            alert(`¡Clase iniciada! ${participants.length} participantes marcados como presentes. Ahora podés marcar quiénes estuvieron ausentes.`);
        } catch (err) {
            console.error(err);
            alert('Error al iniciar la clase: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleClearAttendance = async (userId) => {
        if (!window.confirm('¿Seguro que deseas borrar el registro de este participante para la fecha seleccionada?')) return;
        try {
            setSaving(true);
            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('user_id', userId)
                .eq('event_date', selectedDate);

            if (error) throw error;

            setAttendanceRecord(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
        } catch (err) {
            console.error(err);
            alert('Error al borrar la asistencia.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAttendance = async () => {
        try {
            setSaving(true);

            const recordsToSave = participants
                .filter(p => attendanceRecord[p.id]?.status)
                .map(p => ({
                    user_id: p.id,
                    event_date: selectedDate,
                    status: attendanceRecord[p.id].status,
                    notes: attendanceRecord[p.id].notes || null
                }));

            if (recordsToSave.length === 0) {
                alert('No hay asistencias marcadas para guardar. Primero iniciá la clase.');
                return;
            }

            const { error } = await supabase
                .from('attendance')
                .upsert(recordsToSave, { onConflict: 'user_id,event_date' });

            if (error) throw error;

            alert('¡Planilla guardada con éxito!');

        } catch (err) {
            console.error(err);
            alert('Hubo un error al guardar la asistencia.');
        } finally {
            setSaving(false);
        }
    };

    // Summary counts
    const presentCount = Object.values(attendanceRecord).filter(r => r.status === 'present').length;
    const absentCount = Object.values(attendanceRecord).filter(r => r.status === 'absent').length;
    const excusedCount = Object.values(attendanceRecord).filter(r => r.status === 'excused').length;
    const classStarted = Object.keys(attendanceRecord).length > 0;

    return (
        <div className="attendance-manager">
            <h1 className="admin-page-title">Gestión de Asistencias</h1>
            <p className="admin-page-subtitle">
                Creá la lista de clase para marcar quiénes estuvieron presentes. Todos los participantes arrancan como presentes y podés seleccionar los ausentes.
            </p>

            {fetchError && (
                <div style={{ padding: '15px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ef5350' }}>
                    <strong>⚠️ Error al leer usuarios (Supabase):</strong><br />
                    {fetchError}<br />
                    <small>Si ves un error de recursión o "infinite loop", debes volver a ejecutar el master_setup.sql en Supabase.</small>
                </div>
            )}

            <div className="attendance-controls">
                <div className="date-picker-group">
                    <label>Fecha de la clase / evento:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="eco-input"
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {classStarted && (
                        <div className="attendance-summary">
                            <span className="summary-chip present-chip">✅ {presentCount} presentes</span>
                            <span className="summary-chip absent-chip">❌ {absentCount} ausentes</span>
                            {excusedCount > 0 && <span className="summary-chip excused-chip">⚠️ {excusedCount} justificados</span>}
                        </div>
                    )}
                    <button
                        className="eco-secondary-btn"
                        onClick={handleCrearClase}
                        disabled={loading || saving || participants.length === 0}
                        style={{ background: '#fff', border: '2px solid #112F4E', color: '#112F4E' }}
                    >
                        📝 Crear Lista (Todos Presentes)
                    </button>
                    <button
                        className="eco-primary-btn"
                        onClick={handleSaveAttendance}
                        disabled={saving || loading}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Planilla'}
                    </button>
                </div>
            </div>

            {!classStarted && !loading && (
                <div className="attendance-hint-box">
                    <p>📌 Hacé clic en <strong>"Crear Lista"</strong> para iniciar la clase con todos los participantes marcados como presentes. Luego podés marcar quiénes estuvieron ausentes o justificados.</p>
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Cargando participantes...</div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table attendance-table">
                        <thead>
                            <tr>
                                <th>Participante</th>
                                <th>Rol</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'center' }}>Presente</th>
                                <th style={{ textAlign: 'center' }}>Ausente</th>
                                <th style={{ textAlign: 'center' }}>Justificado</th>
                                <th>Notas (Opcional)</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map(participant => {
                                const currentStatus = attendanceRecord[participant.id]?.status || '';
                                const roleColor = ROLE_COLORS[participant.role] || ROLE_COLORS.student;
                                return (
                                    <tr key={participant.id} className={currentStatus === 'absent' ? 'row-absent' : currentStatus === 'excused' ? 'row-excused' : ''}>
                                        <td style={{ fontWeight: 600, color: '#112F4E' }}>
                                            {participant.full_name}
                                            {participant.status === 'pending' && (
                                                <span style={{ fontSize: '0.7rem', color: '#e65100', backgroundColor: '#fff3e0', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Pendiente</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="role-badge" style={{ background: roleColor.background, color: roleColor.color }}>
                                                {ROLE_LABELS[participant.role] || participant.role}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#666' }}>{participant.email || 'N/A'}</td>

                                        <td align="center">
                                            <label className="custom-radio present-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${participant.id}`}
                                                    checked={currentStatus === 'present'}
                                                    onChange={() => handleStatusChange(participant.id, 'present')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td align="center">
                                            <label className="custom-radio absent-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${participant.id}`}
                                                    checked={currentStatus === 'absent'}
                                                    onChange={() => handleStatusChange(participant.id, 'absent')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td align="center">
                                            <label className="custom-radio excused-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${participant.id}`}
                                                    checked={currentStatus === 'excused'}
                                                    onChange={() => handleStatusChange(participant.id, 'excused')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td>
                                            <input
                                                type="text"
                                                className="eco-input notes-input"
                                                placeholder="Ej. Llegó tarde, viajó..."
                                                value={attendanceRecord[participant.id]?.notes || ''}
                                                onChange={(e) => handleNotesChange(participant.id, e.target.value)}
                                            />
                                        </td>
                                        <td align="center">
                                            {currentStatus && (
                                                <button
                                                    className="eco-secondary-btn"
                                                    onClick={() => handleClearAttendance(participant.id)}
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid #ccc', color: '#666' }}
                                                    title="Borrar registro de asistencia"
                                                >
                                                    Borrar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {participants.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                        No hay participantes registrados en el sistema actualmente. (Los usuarios rechazados no aparecen aquí).
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
