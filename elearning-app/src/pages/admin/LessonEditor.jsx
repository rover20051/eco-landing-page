import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './CourseManager.css';

export default function LessonEditor({ lesson, moduleNumber, onClose, onSaved }) {
    const supabase = useSupabase();
    const [activeTab, setActiveTab] = useState('info');

    // Track lesson ID in state so new lessons can use it across tabs
    const [lessonId, setLessonId] = useState(lesson?.id || null);

    // Info tab
    const [title, setTitle] = useState(lesson?.title || '');
    const [description, setDescription] = useState(lesson?.description || '');
    const [contentText, setContentText] = useState(lesson?.content_text || '');
    const [availableFrom, setAvailableFrom] = useState(lesson?.available_from ? lesson.available_from.slice(0, 10) : '');

    // Content tab
    const [videoUrl, setVideoUrl] = useState(lesson?.video_url || '');
    const [fileUrl, setFileUrl] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);

    // Quiz tab
    const [quizId, setQuizId] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '', '']);
    const [newCorrect, setNewCorrect] = useState(0);
    const [addingQuestion, setAddingQuestion] = useState(false);

    // UI feedback
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const isNew = !lessonId;

    useEffect(() => {
        if (!lessonId) return;
        async function fetchDetails() {
            const [resourcesRes, quizRes] = await Promise.all([
                supabase.from('lesson_resources').select('*').eq('lesson_id', lessonId),
                supabase.from('quizzes').select('id').eq('lesson_id', lessonId).maybeSingle(),
            ]);

            if (resourcesRes.data?.length > 0) setFileUrl(resourcesRes.data[0].file_url);

            if (quizRes.data) {
                setQuizId(quizRes.data.id);
                const { data: questions } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quizRes.data.id)
                    .order('created_at', { ascending: true });
                if (questions) setQuizQuestions(questions);
            }
        }
        fetchDetails();
    }, [lessonId, supabase]);

    const showSuccess = (msg) => {
        setSavedMsg(msg);
        setErrorMsg('');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const showError = (msg) => {
        setErrorMsg(msg);
        setSavedMsg('');
    };

    // ── Info + Content tab save ──────────────────────────────
    const handleSaveInfo = async () => {
        if (!title.trim()) { showError('El título es obligatorio'); return; }
        setSaving(true);
        setErrorMsg('');
        try {
            const payload = {
                title,
                description,
                video_url: videoUrl,
                content_text: contentText,
                available_from: availableFrom || null,
            };

            if (lessonId) {
                const { error } = await supabase.from('lessons').update(payload).eq('id', lessonId);
                if (error) throw error;
                showSuccess('¡Lección guardada correctamente!');
            } else {
                const { data, error } = await supabase
                    .from('lessons')
                    .insert({ ...payload, module_id: lesson.module_id, lesson_number: lesson.lesson_number })
                    .select()
                    .single();
                if (error) throw error;
                setLessonId(data.id);
                showSuccess('¡Lección creada! Podés completar el resto de las pestañas.');
            }
        } catch (err) {
            showError('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveVideoUrl = async () => {
        if (!lessonId) { showError('Guardá primero la información básica de la lección.'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('lessons').update({ video_url: videoUrl }).eq('id', lessonId);
            if (error) throw error;
            showSuccess('Enlace de video guardado.');
        } catch (err) {
            showError('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── File upload ──────────────────────────────────────────
    const handleFileUpload = async (event) => {
        if (!lessonId) { showError('Guardá primero la información básica.'); return; }
        const file = event.target.files[0];
        if (!file) return;
        setUploadingFile(true);
        setErrorMsg('');
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${lessonId}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
            setFileUrl(data.publicUrl);

            await supabase.from('lesson_resources').insert({
                lesson_id: lessonId,
                title: file.name,
                resource_type: 'document',
                file_url: data.publicUrl,
            });
            showSuccess('Archivo subido correctamente.');
        } catch (err) {
            showError('Error al subir: ' + err.message);
        } finally {
            setUploadingFile(false);
        }
    };

    // ── Quiz ─────────────────────────────────────────────────
    const ensureQuiz = async () => {
        if (quizId) return quizId;
        if (!lessonId) { showError('Guardá primero la información básica.'); return null; }
        const { data, error } = await supabase
            .from('quizzes')
            .insert({ lesson_id: lessonId, title: `Quiz — ${title}` })
            .select()
            .single();
        if (error) { showError('Error al crear quiz: ' + error.message); return null; }
        setQuizId(data.id);
        return data.id;
    };

    const handleAddQuestion = async () => {
        if (!newQuestion.trim()) { showError('Escribí la pregunta.'); return; }
        if (newOptions.some(o => !o.trim())) { showError('Completá todas las opciones.'); return; }
        setAddingQuestion(true);
        setErrorMsg('');
        try {
            const qId = await ensureQuiz();
            if (!qId) return;
            const { data, error } = await supabase
                .from('quiz_questions')
                .insert({
                    quiz_id: qId,
                    question_text: newQuestion,
                    options: newOptions,
                    correct_answer: newCorrect,
                })
                .select()
                .single();
            if (error) throw error;
            setQuizQuestions(prev => [...prev, data]);
            setNewQuestion('');
            setNewOptions(['', '', '', '']);
            setNewCorrect(0);
            showSuccess('Pregunta agregada.');
        } catch (err) {
            showError('Error: ' + err.message);
        } finally {
            setAddingQuestion(false);
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm('¿Eliminar esta pregunta?')) return;
        const { error } = await supabase.from('quiz_questions').delete().eq('id', qId);
        if (error) { showError('Error: ' + error.message); return; }
        setQuizQuestions(prev => prev.filter(q => q.id !== qId));
    };

    const handleClose = () => {
        onSaved(); // triggers re-fetch in parent
    };

    const tabStyle = (t) => ({
        padding: '8px 16px',
        borderRadius: '8px',
        border: activeTab === t ? '2px solid #112F4E' : '1px solid rgba(17,47,78,0.2)',
        background: activeTab === t ? '#112F4E' : 'white',
        color: activeTab === t ? '#FAFAEE' : '#112F4E',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
    });

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal-content" style={{ maxWidth: 760, width: '95vw' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>
                        {isNew ? 'Nueva Lección' : `Lección ${moduleNumber}.${lesson.lesson_number}`}
                    </h2>
                    <button className="eco-secondary-btn" onClick={handleClose} style={{ padding: '6px 14px' }}>
                        Cerrar y guardar
                    </button>
                </div>

                {/* Feedback banners */}
                {savedMsg && (
                    <div style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>
                        ✓ {savedMsg}
                    </div>
                )}
                {errorMsg && (
                    <div style={{ background: '#FEECEB', color: '#BD4339', border: '1px solid rgba(189,67,57,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem' }}>
                        ✗ {errorMsg}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>Información</button>
                    <button style={tabStyle('content')} onClick={() => setActiveTab('content')}>Video / Materiales</button>
                    <button style={tabStyle('quiz')} onClick={() => setActiveTab('quiz')}>
                        Cuestionario {quizQuestions.length > 0 ? `(${quizQuestions.length})` : ''}
                    </button>
                </div>

                <div style={{ maxHeight: '58vh', overflowY: 'auto', paddingRight: '6px' }}>

                    {/* ── INFO TAB ── */}
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className="form-label">Título de la Lección *</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Disponible desde (fecha de apertura)</label>
                                <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className="form-input" />
                                <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>Dejalo vacío para que esté disponible inmediatamente.</small>
                            </div>
                            <div>
                                <label className="form-label">Descripción breve (opcional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input" style={{ resize: 'vertical' }} />
                            </div>
                            <div>
                                <label className="form-label">Contenido de la clase / Instrucciones de la tarea</label>
                                <textarea
                                    value={contentText}
                                    onChange={e => setContentText(e.target.value)}
                                    rows={6}
                                    className="form-input"
                                    style={{ resize: 'vertical' }}
                                    placeholder="Explicación, texto de la clase, enunciado de la tarea..."
                                />
                            </div>
                            <button className="eco-primary-btn" onClick={handleSaveInfo} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                                {saving ? 'Guardando...' : isNew ? 'Crear Lección' : 'Guardar Cambios'}
                            </button>
                        </div>
                    )}

                    {/* ── CONTENT TAB ── */}
                    {activeTab === 'content' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {isNew && (
                                <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', padding: '12px 16px', fontSize: '0.88rem', color: '#92400E' }}>
                                    Primero guardá la información básica de la lección en la pestaña "Información".
                                </div>
                            )}
                            <div>
                                <label className="form-label">Enlace de YouTube o Bunny.net (video principal)</label>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={e => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/embed/... o https://iframe.mediadelivery.net/embed/..."
                                    className="form-input"
                                />
                                <small style={{ color: '#888', display: 'block', margin: '6px 0 10px' }}>
                                    Para YouTube usá el link de embed: youtube.com/embed/VIDEO_ID
                                </small>
                                <button className="eco-primary-btn" onClick={handleSaveVideoUrl} disabled={saving || isNew} style={{ padding: '8px 20px' }}>
                                    {saving ? 'Guardando...' : 'Guardar Enlace de Video'}
                                </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(17,47,78,0.08)' }} />

                            <div>
                                <label className="form-label">Material adicional (PDF / DOCX)</label>
                                {fileUrl && (
                                    <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#F4F6F9', borderRadius: '8px', fontSize: '0.88rem' }}>
                                        Archivo actual: <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: '#BD4339', fontWeight: 600 }}>Ver archivo</a>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile || isNew}
                                    className="form-input"
                                    style={{ padding: '8px' }}
                                />
                                {uploadingFile && <p style={{ color: '#666', marginTop: '8px', fontSize: '0.88rem' }}>Subiendo archivo...</p>}
                            </div>
                        </div>
                    )}

                    {/* ── QUIZ TAB ── */}
                    {activeTab === 'quiz' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {isNew && (
                                <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '8px', padding: '12px 16px', fontSize: '0.88rem', color: '#92400E' }}>
                                    Primero guardá la información básica de la lección en la pestaña "Información".
                                </div>
                            )}

                            {/* Existing questions */}
                            {quizQuestions.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h4 style={{ margin: 0, color: '#112F4E', fontFamily: "'Playfair Display', serif" }}>
                                        Preguntas cargadas ({quizQuestions.length})
                                    </h4>
                                    {quizQuestions.map((q, i) => (
                                        <div key={q.id} style={{ background: '#F4F6F9', border: '1px solid rgba(17,47,78,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#112F4E', fontSize: '0.92rem' }}>
                                                        {i + 1}. {q.question_text}
                                                    </p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {(Array.isArray(q.options) ? q.options : []).map((opt, idx) => (
                                                            <span key={idx} style={{
                                                                fontSize: '0.85rem',
                                                                color: idx === q.correct_answer ? '#2E7D32' : '#555',
                                                                fontWeight: idx === q.correct_answer ? 700 : 400,
                                                            }}>
                                                                {idx === q.correct_answer ? '✓ ' : '○ '}{opt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button className="icon-btn icon-btn--danger" onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add new question */}
                            {!isNew && (
                                <div style={{ background: 'white', border: '1px solid rgba(17,47,78,0.1)', borderRadius: '10px', padding: '20px' }}>
                                    <h4 style={{ margin: '0 0 16px', color: '#112F4E' }}>Nueva Pregunta</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label className="form-label">Pregunta</label>
                                            <input type="text" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="form-input" placeholder="¿Cuál es...?" />
                                        </div>
                                        <div>
                                            <label className="form-label">Opciones de respuesta</label>
                                            {newOptions.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <input
                                                        type="radio"
                                                        name="correct"
                                                        checked={newCorrect === idx}
                                                        onChange={() => setNewCorrect(idx)}
                                                        title="Marcar como correcta"
                                                        style={{ accentColor: '#2E7D32', width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => {
                                                            const updated = [...newOptions];
                                                            updated[idx] = e.target.value;
                                                            setNewOptions(updated);
                                                        }}
                                                        className="form-input"
                                                        placeholder={`Opción ${idx + 1}${newCorrect === idx ? ' (correcta)' : ''}`}
                                                        style={{ borderColor: newCorrect === idx ? '#2E7D32' : undefined }}
                                                    />
                                                </div>
                                            ))}
                                            <small style={{ color: '#888' }}>Seleccioná el radio button de la opción correcta.</small>
                                        </div>
                                        <button className="eco-primary-btn" onClick={handleAddQuestion} disabled={addingQuestion} style={{ alignSelf: 'flex-start' }}>
                                            {addingQuestion ? 'Guardando...' : '+ Agregar Pregunta'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {quizQuestions.length === 0 && !isNew && (
                                <p style={{ color: '#888', textAlign: 'center', padding: '20px', background: '#F4F6F9', borderRadius: '8px' }}>
                                    Todavía no hay preguntas para esta lección.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
