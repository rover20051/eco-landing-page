import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useParams, useNavigate } from 'react-router-dom';
import './AssignmentGrader.css';

export default function AssignmentGrader() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Grading form state
    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function fetchAssignment() {
            try {
                setLoading(true);

                if (assignmentId) {
                    // Fetch specific assignment details
                    const { data, error } = await supabase
                        .from('assignments')
                        .select(`
              *,
              profiles(full_name, email),
              lessons(title, modules(module_number))
            `)
                        .eq('id', assignmentId)
                        .single();

                    if (error) throw error;

                    if (isMounted) {
                        setAssignment(data);
                        setGrade(data.grade !== null ? data.grade : '');
                        setFeedback(data.feedback || '');
                    }
                } else {
                    // General view: fetch all assignments waiting for grade
                    const { data, error } = await supabase
                        .from('assignments')
                        .select(`
              *,
              profiles(full_name),
              lessons(title, modules(module_number))
            `)
                        .order('submitted_at', { ascending: false });

                    if (error) throw error;
                    if (isMounted) setAssignment(data); // In this mode, assignment is an array
                }
            } catch (err) {
                console.error('Error fetching assignment(s):', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAssignment();
        return () => { isMounted = false; };
    }, [assignmentId, supabase]);

    const handleGradeSubmit = async () => {
        if (grade === '') {
            alert('Debes ingresar una nota.');
            return;
        }

        try {
            setSubmitting(true);
            const numericGrade = Number(grade);

            const { error } = await supabase
                .from('assignments')
                .update({
                    grade: numericGrade,
                    feedback: feedback,
                    status: 'graded',
                    graded_by: (await supabase.auth.getUser()).data.user?.id || null // If using clerk we might need to rely on backend trigger or pass it
                })
                .eq('id', assignmentId);

            if (error) throw error;

            alert('¡Tarea calificada con éxito!');
            navigate('/admin/assignments'); // Go back to list

        } catch (err) {
            console.error('Error updating grade:', err);
            alert('Error al guardar la calificación.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="admin-loading">Cargando entregas...</div>;

    // VIEW MODE: List all assignments
    if (!assignmentId) {
        const list = Array.isArray(assignment) ? assignment : [];

        return (
            <div className="assignment-grader">
                <h1 className="admin-page-title">Entregas de Tareas</h1>

                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Alumno</th>
                                <th>Lección</th>
                                <th>Fecha Entrega</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(a => (
                                <tr key={a.id}>
                                    <td>
                                        <span className={`status-pill ${a.status}`}>
                                            {a.status === 'submitted' ? 'Pendiente' : 'Corregido'}
                                        </span>
                                    </td>
                                    <td>{a.profiles?.full_name}</td>
                                    <td>M{a.lessons?.modules?.module_number} - {a.lessons?.title}</td>
                                    <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="eco-secondary-btn"
                                            onClick={() => navigate(`/admin/assignments/${a.id}`)}
                                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                        >
                                            Ver Entrega
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {list.length === 0 && <div className="admin-empty-state">No hay entregas registradas.</div>}
                </div>
            </div>
        );
    }

    // GRADING MODE: Single Assignment
    if (!assignment || Array.isArray(assignment)) return <div>No se encontró la tarea.</div>;

    return (
        <div className="assignment-grader single-view">
            <div className="section-header">
                <button className="back-link" onClick={() => navigate('/admin/assignments')}>
                    ← Volver a Entregas
                </button>
            </div>

            <div className="grader-layout">
                {/* Left Side: Student Submission */}
                <div className="submission-content">
                    <div className="submission-header">
                        <h2>{assignment.lessons?.title}</h2>
                        <p className="student-name">Por: {assignment.profiles?.full_name}</p>
                        <p className="submission-date">Entregado el: {new Date(assignment.submitted_at).toLocaleString()}</p>
                    </div>

                    <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: assignment.content_text }} />
                </div>

                {/* Right Side: Grading Panel */}
                <div className="grading-panel">
                    <h3>Calificación</h3>

                    <div className="form-group">
                        <label>Evaluación:</label>
                        <select
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="grade-select"
                        >
                            <option value="">Seleccionar...</option>
                            {/* Simplified binary grading approach based on user request ("Recibida o No entregada") */}
                            <option value="100">Recibida (Aprobado)</option>
                            <option value="0">Demasiado incompleta (Rechazada)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Feedback al alumno (Opcional):</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Buen trabajo en esta lección..."
                            rows={6}
                        />
                    </div>

                    <button
                        className="eco-primary-btn grade-btn"
                        onClick={handleGradeSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Guardando...' : 'Guardar Calificación'}
                    </button>
                </div>
            </div>
        </div>
    );
}
