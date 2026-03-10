import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import LessonEditor from './LessonEditor';
import './CourseManager.css';

export default function CourseManager() {
    const supabase = useSupabase();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingModule, setEditingModule] = useState(null);
    const [showModuleForm, setShowModuleForm] = useState(false);

    const [editingLesson, setEditingLesson] = useState(null);
    const [editingLessonModule, setEditingLessonModule] = useState(null);
    const [showLessonForm, setShowLessonForm] = useState(false);

    const [modTitle, setModTitle] = useState('');
    const [modDesc, setModDesc] = useState('');
    const [modActive, setModActive] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchModules = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const { data, error: err } = await supabase
                .from('modules')
                .select('*, lessons(id, title, lesson_number, task_description, content_text, available_from, youtube_video_id, video_url)')
                .order('module_number', { ascending: true });

            if (err) throw err;

            const sorted = (data || []).map(mod => ({
                ...mod,
                lessons: (mod.lessons || []).sort((a, b) => a.lesson_number - b.lesson_number)
            }));
            setModules(sorted);
        } catch (err) {
            setError('Error cargando módulos: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => { fetchModules(); }, [fetchModules]);

    const handleOpenModuleForm = (mod = null) => {
        setEditingModule(mod);
        setModTitle(mod ? mod.title : '');
        setModDesc(mod ? mod.description || '' : '');
        setModActive(mod ? mod.is_active : false);
        setShowModuleForm(true);
    };

    const handleOpenLesson = (lesson = null, mod = null) => {
        if (mod && !lesson) {
            setEditingLesson({ module_id: mod.id, lesson_number: (mod.lessons?.length || 0) + 1 });
        } else {
            setEditingLesson(lesson);
        }
        setEditingLessonModule(mod);
        setShowLessonForm(true);
    };

    const handleSaveModule = async () => {
        if (!modTitle.trim()) return alert('El título es obligatorio');
        setSaving(true);
        setError('');
        try {
            if (editingModule?.id) {
                const { error: err } = await supabase
                    .from('modules')
                    .update({ title: modTitle, description: modDesc, is_active: modActive })
                    .eq('id', editingModule.id)
                    .select()
                    .single();
                if (err) throw err;
            } else {
                const nextNum = modules.length > 0
                    ? Math.max(...modules.map(m => m.module_number)) + 1
                    : 1;
                const { error: err } = await supabase
                    .from('modules')
                    .insert({ title: modTitle, description: modDesc, module_number: nextNum, is_active: modActive });
                if (err) throw err;
            }
            setShowModuleForm(false);
            await fetchModules();
        } catch (err) {
            setError('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (mod) => {
        try {
            const { error: err } = await supabase
                .from('modules')
                .update({ is_active: !mod.is_active })
                .eq('id', mod.id)
                .select()
                .single();
            if (err) throw err;
            setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_active: !m.is_active } : m));
        } catch (err) {
            alert('Error al cambiar visibilidad: ' + err.message);
        }
    };

    const handleDeleteModule = async (mod) => {
        const confirmed = window.confirm(
            `¿Eliminar el módulo "${mod.title}" y todas sus lecciones?\nEsta acción no se puede deshacer.`
        );
        if (!confirmed) return;
        try {
            const { error: err } = await supabase.from('modules').delete().eq('id', mod.id);
            if (err) throw err;
            setModules(prev => prev.filter(m => m.id !== mod.id));
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    const handleDeleteLesson = async (lesson, mod) => {
        const confirmed = window.confirm(`¿Eliminar la lección "${lesson.title}"?`);
        if (!confirmed) return;
        try {
            const { error: err } = await supabase.from('lessons').delete().eq('id', lesson.id);
            if (err) throw err;
            setModules(prev => prev.map(m =>
                m.id === mod.id
                    ? { ...m, lessons: m.lessons.filter(l => l.id !== lesson.id) }
                    : m
            ));
        } catch (err) {
            alert('Error al eliminar lección: ' + err.message);
        }
    };

    if (loading) return <div className="admin-loading">Cargando módulos...</div>;

    return (
        <div className="course-manager">
            <div className="section-header">
                <h1 className="admin-page-title" style={{ margin: 0 }}>Gestión de Módulos</h1>
                <button className="eco-primary-btn" onClick={() => handleOpenModuleForm()}>
                    + Nuevo Módulo
                </button>
            </div>

            {error && (
                <div className="cm-error-banner">{error}</div>
            )}

            <div className="admin-modules-list">
                {modules.map(mod => (
                    <div key={mod.id} className={`admin-module-card${mod.is_active ? '' : ' module-hidden'}`}>
                        <div className="mod-card-header">
                            <div className="mod-card-title">
                                <span className="mod-label">M{mod.module_number}</span>
                                <h2>{mod.title}</h2>
                                {!mod.is_active && <span className="draft-badge">Oculto</span>}
                            </div>
                            <div className="mod-card-actions">
                                <button
                                    className={`toggle-btn ${mod.is_active ? 'toggle-btn--active' : ''}`}
                                    onClick={() => handleToggleActive(mod)}
                                    title={mod.is_active ? 'Ocultar módulo' : 'Publicar módulo'}
                                >
                                    {mod.is_active ? '👁 Visible' : '🚫 Oculto'}
                                </button>
                                <button className="eco-secondary-btn edit-btn" onClick={() => handleOpenModuleForm(mod)}>
                                    ✎ Editar
                                </button>
                                <button className="delete-btn" onClick={() => handleDeleteModule(mod)}>
                                    🗑 Eliminar
                                </button>
                            </div>
                        </div>

                        {mod.description && <p className="mod-desc">{mod.description}</p>}

                        <div className="mod-lessons">
                            <h4>Lecciones ({mod.lessons?.length || 0})</h4>
                            {mod.lessons?.length > 0 ? (
                                <ul className="admin-lesson-list">
                                    {mod.lessons.map(lesson => (
                                        <li key={lesson.id} className="admin-lesson-item">
                                            <span className="lesson-num">{mod.module_number}.{lesson.lesson_number}</span>
                                            <span className="lesson-name">{lesson.title}</span>
                                            <button className="icon-btn" onClick={() => handleOpenLesson(lesson, mod)}>✎ Editar</button>
                                            <button className="icon-btn icon-btn--danger" onClick={() => handleDeleteLesson(lesson, mod)}>🗑</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="empty-text">No hay lecciones en este módulo.</p>
                            )}
                            <button className="add-lesson-btn" onClick={() => handleOpenLesson(null, mod)}>
                                + Agregar Lección
                            </button>
                        </div>
                    </div>
                ))}
                {modules.length === 0 && (
                    <div className="admin-empty-state">No hay módulos creados. ¡Creá el primero!</div>
                )}
            </div>

            {/* Module Form Modal */}
            {showModuleForm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModuleForm(false)}>
                    <div className="modal-content">
                        <h2>{editingModule?.id ? 'Editar Módulo' : 'Crear Nuevo Módulo'}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label className="form-label">Título del Módulo *</label>
                                <input
                                    type="text"
                                    value={modTitle}
                                    onChange={(e) => setModTitle(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">Descripción Breve</label>
                                <textarea
                                    value={modDesc}
                                    onChange={(e) => setModDesc(e.target.value)}
                                    rows={3}
                                    className="form-input"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <label className="form-toggle">
                                <input
                                    type="checkbox"
                                    checked={modActive}
                                    onChange={(e) => setModActive(e.target.checked)}
                                />
                                <span>Módulo visible para los alumnos</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="eco-secondary-btn" onClick={() => setShowModuleForm(false)}>Cancelar</button>
                            <button className="eco-primary-btn" onClick={handleSaveModule} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Módulo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lesson Editor Modal */}
            {showLessonForm && (
                <LessonEditor
                    lesson={editingLesson}
                    moduleNumber={editingLessonModule?.module_number}
                    onClose={() => setShowLessonForm(false)}
                    onSaved={() => {
                        setShowLessonForm(false);
                        fetchModules();
                    }}
                />
            )}
        </div>
    );
}
