import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import './AssignmentTab.css';

export default function AssignmentTab({ lessonId, taskDescription }) {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [assignment, setAssignment] = useState(null);
    const [content, setContent] = useState('');
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
                    setContent(data.content_text || '');
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
        if (!content.trim() || content === '<p><br></p>') {
            alert('Por favor escribe algo antes de enviar.');
            return;
        }

        try {
            setSubmitting(true);

            const assignmentData = {
                lesson_id: lessonId,
                user_id: profile.id,
                content_text: content,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('assignments')
                .upsert(assignmentData, { onConflict: 'lesson_id,user_id' })
                .select()
                .single();

            if (error) throw error;

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
            alert('Hubo un error al enviar la tarea. Intenta de nuevo.');
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
                    <div dangerouslySetInnerHTML={{ __html: taskDescription }} />
                ) : (
                    <p>Escribe aquí tu reflexión sobre esta lección.</p>
                )}
            </div>

            <div className="assignment-editor-container">
                {assignment?.status === 'graded' ? (
                    <div className="graded-notice">
                        <div className="grade-badge">
                            {assignment.grade === 100 ? '✅ RECIBIDA' : assignment.grade === 0 ? '❌ NO ENTREGADA' : `NOTA: ${assignment.grade}/100`}
                        </div>
                        {assignment.feedback && (
                            <div className="feedback-box">
                                <h4>Feedback del Mentor:</h4>
                                <p>{assignment.feedback}</p>
                            </div>
                        )}
                        <div className="readonly-content">
                            <h4>Tu entrega:</h4>
                            <div dangerouslySetInnerHTML={{ __html: assignment.content_text }} />
                        </div>
                    </div>
                ) : (
                    <>
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            className="eco-quill"
                            placeholder="Escribe tu respuesta aquí..."
                        />
                        <div className="assignment-actions">
                            <button
                                className="eco-primary-btn"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Enviando...' : (assignment ? 'Actualizar Entrega' : 'Enviar Tarea')}
                            </button>
                            {assignment && <span className="status-badge">Entregada (Pendiente de revisión)</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
