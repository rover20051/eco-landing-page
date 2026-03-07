import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './AttendanceManager.css';

export default function AttendanceManager() {
    const supabase = useSupabase();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // We will track attendance by date for the MVP
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // Mapping structure: { "user_id": { status: "present", notes: "" } }
    const [attendanceRecord, setAttendanceRecord] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadAttendanceData() {
            setLoading(true);
            try {
                // 1. Fetch all active students
                const { data: usersData, error: usersError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('role', 'student')
                    .eq('status', 'approved')
                    .order('full_name', { ascending: true });

                if (usersError) throw usersError;

                // 2. Fetch existing attendance records for the selected date
                const { data: attData, error: attError } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('event_date', selectedDate);

                if (attError) throw attError;

                // 3. Build state maps
                if (isMounted) {
                    setStudents(usersData || []);

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
                console.error("Error fetching attendance:", err);
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
                status: status
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

    const handleSaveAttendance = async () => {
        try {
            setSaving(true);

            // Convert our map into an array of rows for upserting
            const recordsToSave = students
                .filter(student => attendanceRecord[student.id]?.status) // only save if they have a status selected
                .map(student => ({
                    user_id: student.id,
                    event_date: selectedDate,
                    status: attendanceRecord[student.id].status,
                    notes: attendanceRecord[student.id].notes || null
                }));

            if (recordsToSave.length === 0) {
                alert('No hay asistencias marcadas para guardar.');
                return;
            }

            const { error } = await supabase
                .from('attendance')
                .upsert(recordsToSave, { onConflict: 'user_id,event_date' });

            if (error) throw error;

            alert('¡Asistencia guardada con éxito!');

        } catch (err) {
            console.error(err);
            alert('Hubo un error al guardar la asistencia.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="attendance-manager">
            <h1 className="admin-page-title">Gestión de Asistencias</h1>
            <p className="admin-page-subtitle">Toma lista de los alumnos según el cronograma y sumales puntos de presencialidad.</p>

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

                <button
                    className="eco-primary-btn"
                    onClick={handleSaveAttendance}
                    disabled={saving || loading}
                >
                    {saving ? 'Guardando...' : '💾 Guardar Planilla de Hoy'}
                </button>
            </div>

            {loading ? (
                <div className="admin-loading">Cargando alumnos...</div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table attendance-table">
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'center' }}>Presente</th>
                                <th style={{ textAlign: 'center' }}>Ausente</th>
                                <th style={{ textAlign: 'center' }}>Justificado</th>
                                <th>Notas (Opcional)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
                                const currentStatus = attendanceRecord[student.id]?.status || '';
                                return (
                                    <tr key={student.id}>
                                        <td style={{ fontWeight: 600, color: '#112F4E' }}>{student.full_name}</td>
                                        <td style={{ fontSize: '0.85rem', color: '#666' }}>{student.email || 'N/A'}</td>

                                        <td align="center">
                                            <label className="custom-radio present-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${student.id}`}
                                                    checked={currentStatus === 'present'}
                                                    onChange={() => handleStatusChange(student.id, 'present')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td align="center">
                                            <label className="custom-radio absent-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${student.id}`}
                                                    checked={currentStatus === 'absent'}
                                                    onChange={() => handleStatusChange(student.id, 'absent')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td align="center">
                                            <label className="custom-radio excused-radio">
                                                <input
                                                    type="radio"
                                                    name={`status_${student.id}`}
                                                    checked={currentStatus === 'excused'}
                                                    onChange={() => handleStatusChange(student.id, 'excused')}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </td>

                                        <td>
                                            <input
                                                type="text"
                                                className="eco-input notes-input"
                                                placeholder="Ej. Llegó tarde, viajó..."
                                                value={attendanceRecord[student.id]?.notes || ''}
                                                onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                        No hay alumnos registrados o aprobados en el sistema actualmente.
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
