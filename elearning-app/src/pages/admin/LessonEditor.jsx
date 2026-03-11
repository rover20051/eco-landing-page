import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './CourseManager.css';

// Extracts YouTube video ID from various URL formats
function extractYoutubeId(url) {
    if (!url) return null;
    const patterns = [
        /youtube\.com\/embed\/([^?&/]+)/,
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?&/]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

export default function LessonEditor({ lesson, moduleNumber, onClose, onSaved }) {
    const supabase = useSupabase();
    const [activeTab, setActiveTab] = useState('info');

    // Track lesson ID in state so new lessons can use it across tabs
    const [lessonId, setLessonId] = useState(lesson?.id || null);

    const [title, setTitle] = useState(lesson?.title || '');
    const [description, setDescription] = useState(lesson?.task_description || '');
    const [contentText, setContentText] = useState(lesson?.content_text || '');
    const [availableFrom, setAvailableFrom] = useState(lesson?.available_from ? lesson.available_from.slice(0, 10) : '');

    const [videoUrl, setVideoUrl] = useState(
        lesson?.video_url ||
        (lesson?.youtube_video_id ? `https://www.youtube.com/embed/${lesson.youtube_video_id}` : '')
    );
    const [resources, setResources] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '', '']);
    const [newCorrect, setNewCorrect] = useState(0);
    const [addingQuestion, setAddingQuestion] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null); // { id, question_text, quiz_options, correctIdx }

    // UI feedback
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const isNew = !lessonId;

    useEffect(() => {
        if (!lessonId) return;
        async function fetchDetails() {
            const [resourcesRes, questionsRes] = await Promise.all([
                supabase.from('lesson_resources').select('*').eq('lesson_id', lessonId),
                supabase
                    .from('quiz_questions')
                    .select('*, quiz_options(*)')
                    .eq('lesson_id', lessonId)
                    .order('question_order', { ascending: true }),
            ]);

            if (resourcesRes.data?.length > 0) setResources(resourcesRes.data);

            if (questionsRes.data) {
                const sorted = questionsRes.data.map(q => ({
                    ...q,
                    quiz_options: (q.quiz_options || []).sort((a, b) => a.option_order - b.option_order),
                }));
                setQuizQuestions(sorted);
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
        if (!title.trim()) { showError('El título es obligatorio'); return false; }
        setSaving(true);
        setErrorMsg('');
        try {
            const ytId = extractYoutubeId(videoUrl);
            const payload = {
                title,
                task_description: description,
                video_url: videoUrl || null,
                youtube_video_id: ytId || lesson?.youtube_video_id || null,
                content_text: contentText,
                available_from: availableFrom || null,
            };

            if (lessonId) {
                const { error } = await supabase.from('lessons').update(payload).eq('id', lessonId).select().single();
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
            return true;
        } catch (err) {
            console.error("Save info error:", err);
            showError('Error al guardar: ' + err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveVideoUrl = async () => {
        if (!lessonId) { showError('Guardá primero la información básica de la lección.'); return false; }
        setSaving(true);
        try {
            const ytId = extractYoutubeId(videoUrl);
            const { error } = await supabase.from('lessons').update({
                video_url: videoUrl || null,
                youtube_video_id: ytId || null,
            }).eq('id', lessonId).select().single();
            if (error) throw error;
            showSuccess('Enlace de video guardado.');
            return true;
        } catch (err) {
            console.error("Save video url error:", err);
            showError('Error: ' + err.message);
            return false;
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
            const { error: uploadError } = await supabase.storage.from('lesson-resources').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('lesson-resources').getPublicUrl(filePath);

            const { data: newResource, error: insertError } = await supabase.from('lesson_resources').insert({
                lesson_id: lessonId,
                title: file.name,
                resource_type: 'document',
                file_url: data.publicUrl,
            }).select().single();
            if (insertError) throw insertError;

            setResources(prev => [...prev, newResource]);
            showSuccess('Archivo subido correctamente.');
        } catch (err) {
            showError('Error al subir: ' + err.message);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleDeleteResource = async (resource) => {
        if (!window.confirm(`¿Eliminar el archivo "${resource.title}"?`)) return;
        try {
            // Extract storage path from public URL (everything after /lesson-resources/)
            const urlParts = resource.file_url.split('/lesson-resources/');
            if (urlParts[1]) {
                await supabase.storage.from('lesson-resources').remove([urlParts[1]]);
            }
            const { error } = await supabase.from('lesson_resources').delete().eq('id', resource.id);
            if (error) throw error;
            setResources(prev => prev.filter(r => r.id !== resource.id));
            showSuccess('Archivo eliminado.');
        } catch (err) {
            showError('Error al eliminar: ' + err.message);
        }
    };

    // ── Quiz ─────────────────────────────────────────────────
    const handleAddQuestion = async () => {
        if (!newQuestion.trim()) { showError('Escribí la pregunta.'); return; }
        if (newOptions.some(o => !o.trim())) { showError('Completá todas las opciones.'); return; }
        if (!lessonId) { showError('Guardá primero la información básica.'); return; }
        setAddingQuestion(true);
        setErrorMsg('');
        try {
            // Insert question
            const { data: newQ, error: qErr } = await supabase
                .from('quiz_questions')
                .insert({
                    lesson_id: lessonId,
                    question_text: newQuestion,
                    question_order: quizQuestions.length + 1,
                })
                .select()
                .single();
            if (qErr) throw qErr;

            // Insert options
            const optionRecords = newOptions.map((opt, idx) => ({
                question_id: newQ.id,
                option_text: opt,
                is_correct: idx === newCorrect,
                option_order: idx + 1,
            }));
            const { error: optErr } = await supabase.from('quiz_options').insert(optionRecords);
            if (optErr) throw optErr;

            // Update local state with embedded options
            setQuizQuestions(prev => [
                ...prev,
                { ...newQ, quiz_options: optionRecords.map((o, i) => ({ ...o, id: `tmp-${newQ.id}-${i}` })) },
            ]);
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

    const handleStartEdit = (q) => {
        setEditingQuestion({
            id: q.id,
            question_text: q.question_text,
            options: q.quiz_options.map(o => ({ ...o })),
            correctIdx: q.quiz_options.findIndex(o => o.is_correct),
        });
    };

    const handleSaveEditedQuestion = async () => {
        const { id, question_text, options, correctIdx } = editingQuestion;
        if (!question_text.trim()) { showError('Escribí la pregunta.'); return; }
        if (options.some(o => !o.option_text.trim())) { showError('Completá todas las opciones.'); return; }
        try {
            const { error: qErr } = await supabase.from('quiz_questions').update({ question_text }).eq('id', id);
            if (qErr) throw qErr;

            for (let i = 0; i < options.length; i++) {
                const { error: oErr } = await supabase.from('quiz_options').update({
                    option_text: options[i].option_text,
                    is_correct: i === correctIdx,
                }).eq('id', options[i].id);
                if (oErr) throw oErr;
            }

            setQuizQuestions(prev => prev.map(q => q.id === id
                ? { ...q, question_text, quiz_options: options.map((o, i) => ({ ...o, is_correct: i === correctIdx })) }
                : q
            ));
            setEditingQuestion(null);
            showSuccess('Pregunta actualizada.');
        } catch (err) {
            showError('Error: ' + err.message);
        }
    };

    const handleClose = async () => {
        if (title.trim()) {
            const success = await handleSaveInfo();
            if (!success) return; // Prevent closing if saving failed
        }
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
                                <label className="form-label">Instrucciones de la tarea <span style={{ fontWeight: 400, color: '#888' }}>(aparece en el tab "Tareas" del alumno)</span></label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input" style={{ resize: 'vertical' }} placeholder="Ej: Reflexioná sobre la lección y escribí cómo la aplicarías..." />
                            </div>
                            <div>
                                <label className="form-label">Descripción / Contenido de la clase <span style={{ fontWeight: 400, color: '#888' }}>(aparece en la vista principal de la lección)</span></label>
                                <textarea
                                    value={contentText}
                                    onChange={e => setContentText(e.target.value)}
                                    rows={6}
                                    className="form-input"
                                    style={{ resize: 'vertical' }}
                                    placeholder="Explicación o descripción de la clase para que el alumno la vea al abrir la lección..."
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
                                <label className="form-label">Enlace de YouTube (video principal)</label>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={e => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/... o embed URL"
                                    className="form-input"
                                />
                                <small style={{ color: '#888', display: 'block', margin: '6px 0 10px' }}>
                                    Podés pegar cualquier formato de URL de YouTube (watch, youtu.be o embed).
                                </small>
                                <button className="eco-primary-btn" onClick={handleSaveVideoUrl} disabled={saving || isNew} style={{ padding: '8px 20px' }}>
                                    {saving ? 'Guardando...' : 'Guardar Enlace de Video'}
                                </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(17,47,78,0.08)' }} />

                            <div>
                                <label className="form-label">Material adicional (PDF / DOCX)</label>
                                {resources.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                        {resources.map(r => (
                                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F4F6F9', borderRadius: '8px', fontSize: '0.88rem' }}>
                                                <a href={r.file_url} target="_blank" rel="noreferrer" style={{ color: '#112F4E', fontWeight: 600 }}>
                                                    📄 {r.title}
                                                </a>
                                                <button
                                                    className="icon-btn icon-btn--danger"
                                                    onClick={() => handleDeleteResource(r)}
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    🗑 Eliminar
                                                </button>
                                            </div>
                                        ))}
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

                            {/* Editar pregunta inline */}
                            {editingQuestion && (
                                <div style={{ background: '#EEF4FF', border: '2px solid #112F4E', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h4 style={{ margin: 0, color: '#112F4E' }}>Editar Pregunta</h4>
                                    <input
                                        type="text"
                                        value={editingQuestion.question_text}
                                        onChange={e => setEditingQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                                        className="form-input"
                                    />
                                    <div>
                                        <label className="form-label">Opciones</label>
                                        {editingQuestion.options.map((opt, idx) => (
                                            <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <input
                                                    type="radio"
                                                    name="editCorrect"
                                                    checked={editingQuestion.correctIdx === idx}
                                                    onChange={() => setEditingQuestion(prev => ({ ...prev, correctIdx: idx }))}
                                                    style={{ accentColor: '#2E7D32', width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={opt.option_text}
                                                    onChange={e => {
                                                        const updated = editingQuestion.options.map((o, i) =>
                                                            i === idx ? { ...o, option_text: e.target.value } : o
                                                        );
                                                        setEditingQuestion(prev => ({ ...prev, options: updated }));
                                                    }}
                                                    className="form-input"
                                                    style={{ borderColor: editingQuestion.correctIdx === idx ? '#2E7D32' : undefined }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="eco-primary-btn" onClick={handleSaveEditedQuestion}>Guardar cambios</button>
                                        <button className="eco-secondary-btn" onClick={() => setEditingQuestion(null)}>Cancelar</button>
                                    </div>
                                </div>
                            )}

                            {/* Preguntas cargadas */}
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
                                                        {(q.quiz_options || []).map((opt) => (
                                                            <span key={opt.id} style={{
                                                                fontSize: '0.85rem',
                                                                color: opt.is_correct ? '#2E7D32' : '#555',
                                                                fontWeight: opt.is_correct ? 700 : 400,
                                                            }}>
                                                                {opt.is_correct ? '✓ ' : '○ '}{opt.option_text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button className="icon-btn" onClick={() => handleStartEdit(q)}>✎ Editar</button>
                                                    <button className="icon-btn icon-btn--danger" onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                                                </div>
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
