import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import './AssignmentTab.css';

export default function AssignmentTab({ lessonId, taskDescription }) {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [assignment, setAssignment] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!profile || !lessonId) return;

        let isMounted = true;
        async function loadAssignment() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('lesson_id', lessonId)
                    .eq('user_id', profile.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data && isMounted) {
                    setAssignment(data);
                }
            } catch (err) {
                console.error('Error loading assignment:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadAssignment();
        return () => { isMounted = false; };
    }, [lessonId, profile, supabase]);

    const handleSubmit = async () => {
        if (!file && !assignment?.file_url) {
            alert('Por favor selecciona un archivo (.pdf o .docx) antes de enviar.');
            return;
        }

        try {
            setSubmitting(true);
            let finalFileUrl = assignment?.file_url;

            if (file) {
                // Determine file extension
                const ext = file.name.split('.').pop();
                // Subiendo a storage en carpeta de usuario para respetar RLS
                const filePath = `${profile.id}/${lessonId}_${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('assignments').upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

                if (uploadError) {
                    throw new Error('Storage: No se pudo subir el archivo. ' + uploadError.message);
                }

                const { data } = supabase.storage.from('assignments').getPublicUrl(filePath);
                finalFileUrl = data.publicUrl;
            }

            const assignmentData = {
                lesson_id: lessonId,
                user_id: profile.id,
                file_url: finalFileUrl,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('assignments')
                .upsert(assignmentData, { onConflict: 'lesson_id,user_id' })
                .select()
                .single();

            if (error) {
                throw new Error('Base de datos: No se pudo registrar la entrega de la tarea. ' + error.message);
            }

            // Update global lesson progress logic here
            await supabase
                .from('lesson_progress')
                .upsert({
                    user_id: profile.id,
                    lesson_id: lessonId,
                    assignment_submitted: true
                }, { onConflict: 'user_id,lesson_id' });

            setAssignment(data);
            alert('¡Tarea enviada exitosamente!');
        } catch (err) {
            console.error('Error submitting assignment:', err);
            alert(err.message || 'Hubo un error al enviar la tarea. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="tab-loading">Cargando tarea...</div>;

    return (
        <div className="assignments-tab">
            <h3>Tarea de la Lección</h3>
            <div className="task-desc">
                {taskDescription ? (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{taskDescription}</p>
                ) : (
                    <p>Escribe aquí tu reflexión sobre esta lección.</p>
                )}
            </div>

            <div className="assignment-editor-container">
                {assignment?.status === 'graded' && assignment.grade === 100 ? (
                    <div className="graded-notice">
                        <div className="grade-badge approved" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                            ✅ REVISADA Y APROBADA
                        </div>
                        {assignment.feedback && (
                            <div className="feedback-box">
                                <h4>Feedback del Mentor:</h4>
                                <p>{assignment.feedback}</p>
                            </div>
                        )}
                        <div className="readonly-content">
                            <h4>Tu entrega final:</h4>
                            {assignment.file_url ? (
                                <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="eco-secondary-btn" style={{ display: 'inline-block', marginTop: '10px' }}>
                                    📄 Ver archivo entregado
                                </a>
                            ) : (
                                <p>No hay archivo adjunto.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {assignment?.status === 'graded' && assignment.grade === 0 && (
                            <div className="graded-notice rejected" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#ffebee', borderRadius: '8px', border: '1px solid #ef5350' }}>
                                <div className="grade-badge rejected" style={{ backgroundColor: '#c62828', color: '#ffffff', padding: '5px 10px', borderRadius: '4px', display: 'inline-block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    ❌ NO APROBADA - Por favor envía un nuevo trabajo
                                </div>
                                {assignment.feedback && (
                                    <div className="feedback-box" style={{ marginTop: '10px' }}>
                                        <h4 style={{ color: '#c62828', marginBottom: '5px' }}>Comentarios del Mentor:</h4>
                                        <p style={{ margin: 0 }}>{assignment.feedback}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ marginBottom: '20px' }}>
                            <label className="eco-file-label" style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Selecciona tu documento (PDF o DOCX)</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="eco-file-input"
                                disabled={submitting}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
                            />
                            {assignment?.file_url && !file && (
                                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                                    Ya tenías una entrega: <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#BD4339', fontWeight: 600 }}>Ver archivo</a>
                                </p>
                            )}
                        </div>
                        <div className="assignment-actions">
                            <button
                                className="eco-primary-btn"
                                onClick={handleSubmit}
                                disabled={submitting || (!file && !assignment?.file_url)}
                            >
                                {submitting ? 'Subiendo archivo...' : (assignment ? 'Actualizar Entrega' : 'Enviar Tarea')}
                            </button>
                            {assignment?.status === 'submitted' && <span className="status-badge" style={{ marginLeft: '15px', color: '#666' }}>Entregada (Pendiente de revisión)</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
