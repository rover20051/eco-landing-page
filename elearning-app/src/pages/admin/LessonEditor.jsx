import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './CourseManager.css';

export default function LessonEditor({ lesson, moduleNumber, onClose, onSaved }) {
    const supabase = useSupabase();

    // Tabs: info, content(video/pdf), assignment, quiz
    const [activeTab, setActiveTab] = useState('info');

    const [title, setTitle] = useState(lesson ? lesson.title : '');
    const [description, setDescription] = useState(lesson ? lesson.description : '');
    const [videoUrl, setVideoUrl] = useState(lesson ? lesson.video_url || '' : '');
    const [contentText, setContentText] = useState(lesson ? lesson.content_text || '' : '');
    const [availableFrom, setAvailableFrom] = useState(lesson && lesson.available_from ? lesson.available_from : '');

    // Assignment
    const [assignmentTitle, setAssignmentTitle] = useState('Entregable: Reflexión Práctica');
    const [assignmentDesc, setAssignmentDesc] = useState('');

    // Quiz
    const [quizQuestions, setQuizQuestions] = useState([]);

    const [loading, setLoading] = useState(false);

    // File upload
    const [uploadingFile, setUploadingFile] = useState(false);
    const [fileUrl, setFileUrl] = useState('');

    useEffect(() => {
        if (!lesson?.id) return;

        async function fetchDetails() {
            setLoading(true);

            // Wait for both assignment text from somewhere? Actually assignment instructions 
            // are currently stored... wait, where are assignment instructions stored?
            // Usually they might be inside content_text or a separate table `lesson_assignments_config`.
            // Let's store assignment instructions in `content_text` (JSON) or just in the description, or we can use `content_text` field in lessons for general HTML.

            // Let's fetch the quiz
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('id')
                .eq('lesson_id', lesson.id)
                .single();

            if (quizData) {
                const { data: questions } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quizData.id);
                if (questions) setQuizQuestions(questions);
            }

            // Fetch resources (PDFs)
            const { data: resources } = await supabase
                .from('lesson_resources')
                .select('*')
                .eq('lesson_id', lesson.id);

            if (resources && resources.length > 0) {
                setFileUrl(resources[0].file_url);
            }

            setLoading(false);
        }

        fetchDetails();
    }, [lesson, supabase]);

    const handleSaveInfo = async () => {
        setLoading(true);
        if (lesson?.id) {
            await supabase
                .from('lessons')
                .update({
                    title,
                    description,
                    video_url: videoUrl,
                    content_text: contentText,
                    available_from: availableFrom || null
                })
                .eq('id', lesson.id);
        } else {
            // New lesson
            const { data, error } = await supabase
                .from('lessons')
                .insert({
                    module_id: lesson.module_id,
                    lesson_number: lesson.lesson_number,
                    title,
                    description,
                    video_url: videoUrl,
                    content_text: contentText,
                    available_from: availableFrom || null
                })
                .select()
                .single();

            if (error) {
                alert('Error al crear la lección: ' + error.message);
                setLoading(false);
                return;
            }
            lesson.id = data.id; // Mutate prop to allow subsequent saves/uploads in same session
        }
        setLoading(false);
        alert('Datos de lección guardados');
        onSaved();
    };

    const handleFileUpload = async (event) => {
        try {
            setUploadingFile(true);
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${lesson.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('materials')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('materials').getPublicUrl(filePath);

            setFileUrl(data.publicUrl);

            // Save to lesson_resources
            await supabase.from('lesson_resources').insert({
                lesson_id: lesson.id,
                title: file.name,
                resource_type: 'document',
                file_url: data.publicUrl
            });

            alert('Archivo subido con éxito');
        } catch (error) {
            console.error(error);
            alert('Error al subir el archivo');
        } finally {
            setUploadingFile(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 800 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>{lesson ? `Editar Lección ${moduleNumber}.${lesson.lesson_number}` : 'Nueva Lección'}</h2>
                    <button className="eco-secondary-btn" onClick={onClose} style={{ padding: '6px 12px' }}>Cerrar</button>
                </div>

                <div className="lesson-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <button className={`eco-secondary-btn ${activeTab === 'info' ? 'active-tab' : ''}`} onClick={() => setActiveTab('info')} style={{ border: activeTab === 'info' ? '2px solid #112F4E' : 'none' }}>Información Base</button>
                    <button className={`eco-secondary-btn ${activeTab === 'content' ? 'active-tab' : ''}`} onClick={() => setActiveTab('content')} style={{ border: activeTab === 'content' ? '2px solid #112F4E' : 'none' }}>Video / Materiales</button>
                    <button className={`eco-secondary-btn ${activeTab === 'quiz' ? 'active-tab' : ''}`} onClick={() => setActiveTab('quiz')} style={{ border: activeTab === 'quiz' ? '2px solid #112F4E' : 'none' }}>Cuestionario</button>
                </div>

                <div className="lesson-editor-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                    {activeTab === 'info' && (
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Título de la Lección</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Disponible desde (Fecha de apertura)</label>
                                <input
                                    type="date"
                                    value={availableFrom}
                                    onChange={(e) => setAvailableFrom(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                />
                                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>Si se deja en blanco, la lección estará disponible inmediatamente.</small>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Descripción / Resumen (Opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Texto detallado de la Lección / Explicación de Tarea</label>
                                <textarea
                                    value={contentText}
                                    onChange={(e) => setContentText(e.target.value)}
                                    rows={6}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
                                    placeholder="Puedes redactar aquí toda la explicación o la tarea a realizar por el alumno..."
                                />
                            </div>
                            <button className="eco-primary-btn" onClick={handleSaveInfo} disabled={loading} style={{ alignSelf: 'flex-start' }}>
                                {loading ? 'Guardando...' : 'Guardar Información'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Enlace de YouTube o Drive (Video principal)</label>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtu.be/..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                />
                                <button className="eco-secondary-btn" onClick={handleSaveInfo} style={{ marginTop: '10px', padding: '6px 16px' }}>Guardar Enlace</button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Material Adicional (PDF/DOCX)</label>
                                {fileUrl && (
                                    <div style={{ marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                                        Archivo actual: <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: '#BD4339' }}>Ver Archivo</a>
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile || !lesson?.id}
                                        style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #ccc', flexGrow: 1 }}
                                    />
                                    {uploadingFile && <span>Subiendo...</span>}
                                </div>
                                {!lesson?.id && <small style={{ color: '#666' }}>Debes crear y guardar la lección primero para poder subir un archivo.</small>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'quiz' && (
                        <div>
                            <p style={{ color: '#666', marginBottom: '16px' }}>En esta vista podrás cargar preguntas para evaluar esta lección.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {quizQuestions.map((q, i) => (
                                    <div key={q.id || i} style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', background: '#f9f9f9' }}>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Pregunta {i + 1}:</label>
                                        <input type="text" value={q.question_text} readOnly style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />

                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Opciones / JSON:</label>
                                        <textarea value={JSON.stringify(q.options)} readOnly rows={2} style={{ width: '100%', padding: '8px', marginBottom: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                ))}
                                {quizQuestions.length === 0 && (
                                    <div style={{ padding: '20px', border: '1px dashed #ccc', textAlign: 'center', color: '#666' }}>
                                        No hay preguntas cargadas para este cuestionario.
                                    </div>
                                )}

                                <button className="eco-secondary-btn" onClick={() => alert('Edición de preguntas en construcción. ¡Ya casi!')} style={{ alignSelf: 'center', marginTop: '10px' }}>
                                    + Añadir / Editar Preguntas
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
