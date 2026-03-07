import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import LessonEditor from './LessonEditor';
import './CourseManager.css';

export default function CourseManager() {
    const supabase = useSupabase();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    // States for simplified Module Form overlay
    const [editingModule, setEditingModule] = useState(null);
    const [showModuleForm, setShowModuleForm] = useState(false);

    // States for Lesson Editor overlay
    const [editingLesson, setEditingLesson] = useState(null);
    const [showLessonForm, setShowLessonForm] = useState(false);

    const [modTitle, setModTitle] = useState('');
    const [modDesc, setModDesc] = useState('');

    useEffect(() => {
        let isMounted = true;
        async function fetchModules() {
            try {
                setLoading(true);
                // Fetch all modules, including their lessons count and title
                const { data, error } = await supabase
                    .from('modules')
                    .select(`
            *,
            lessons(id, title, lesson_number)
          `)
                    .order('module_number', { ascending: true });

                if (error) throw error;

                // Let's sort lessons inside the module to match lesson_number order
                const sortedData = data.map(mod => ({
                    ...mod,
                    lessons: mod.lessons.sort((a, b) => a.lesson_number - b.lesson_number)
                }));

                if (isMounted) setModules(sortedData || []);
            } catch (err) {
                console.error('Error fetching modules:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchModules();
        return () => { isMounted = false; };
    }, [supabase, showModuleForm]); // re-fetch if form closes (assumes data changed)

    const handleOpenForm = (mod = null) => {
        setEditingModule(mod);
        setModTitle(mod ? mod.title : '');
        setModDesc(mod ? mod.description : '');
        setShowModuleForm(true);
    };

    const handleOpenLesson = (lesson = null, mod = null) => {
        // We pass the lesson to the LessonEditor
        // If it's a new lesson we need the module id
        if (mod && !lesson) {
            setEditingLesson({ module_id: mod.id, lesson_number: (mod.lessons?.length || 0) + 1 });
        } else {
            setEditingLesson(lesson);
        }
        setEditingModule(mod); // to pass the module number to the editor
        setShowLessonForm(true);
    };

    const handleSaveModule = async () => {
        if (!modTitle.trim()) return alert("El título es obligatorio");

        try {
            if (editingModule?.id) {
                // Update
                await supabase
                    .from('modules')
                    .update({ title: modTitle, description: modDesc })
                    .eq('id', editingModule.id);
            } else {
                // Insert (simplification: get next module_number)
                const nextNum = modules.length > 0 ? Math.max(...modules.map(m => m.module_number)) + 1 : 1;
                await supabase
                    .from('modules')
                    .insert({ title: modTitle, description: modDesc, module_number: nextNum, is_active: false });
            }
            setShowModuleForm(false);
            // Quick reload
            window.location.reload();
        } catch (err) {
            console.error('Error saving module:', err);
        }
    };

    if (loading && !showModuleForm) return <div className="admin-loading">Cargando módulos...</div>;

    return (
        <div className="course-manager">
            <div className="section-header">
                <h1 className="admin-page-title" style={{ margin: 0 }}>Gestión de Módulos</h1>
                <button
                    className="eco-primary-btn"
                    onClick={() => handleOpenForm()}
                    style={{ width: 'auto', padding: '10px 20px' }}
                >
                    + Nuevo Módulo
                </button>
            </div>

            <div className="admin-modules-list">
                {modules.map(mod => (
                    <div key={mod.id} className="admin-module-card">
                        <div className="mod-card-header">
                            <div className="mod-card-title">
                                <span className="mod-label" style={{ fontSize: '1rem' }}>M{mod.module_number}</span>
                                <h2>{mod.title}</h2>
                                {!mod.is_active && <span className="draft-badge">Oculto / Borrador</span>}
                            </div>
                            <button className="eco-secondary-btn edit-btn" onClick={() => handleOpenForm(mod)}>
                                Editar Módulo
                            </button>
                        </div>

                        <p className="mod-desc">{mod.description}</p>

                        <div className="mod-lessons">
                            <h4>Lecciones ({mod.lessons?.length || 0})</h4>
                            {mod.lessons?.length > 0 ? (
                                <ul className="admin-lesson-list">
                                    {mod.lessons.map(lesson => (
                                        <li key={lesson.id} className="admin-lesson-item">
                                            <span className="lesson-num">{mod.module_number}.{lesson.lesson_number}</span>
                                            <span className="lesson-name">{lesson.title}</span>
                                            <button className="icon-btn" onClick={() => handleOpenLesson(lesson, mod)}>✎ Editar</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="empty-text">No hay lecciones en este módulo.</p>
                            )}
                            <button
                                className="add-lesson-btn"
                                onClick={() => handleOpenLesson(null, mod)}
                            >
                                + Agregar Lección
                            </button>
                        </div>
                    </div>
                ))}
                {modules.length === 0 && <div className="admin-empty-state">No hay módulos creados.</div>}
            </div>

            {showModuleForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingModule?.id ? 'Editar Módulo' : 'Crear Nuevo Módulo'}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Título del Módulo</label>
                                <input
                                    type="text"
                                    value={modTitle}
                                    onChange={(e) => setModTitle(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#112F4E' }}>Descripción Breve</label>
                                <textarea
                                    value={modDesc}
                                    onChange={(e) => setModDesc(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                            <button className="eco-secondary-btn" onClick={() => setShowModuleForm(false)} style={{ padding: '8px 16px' }}>Cancelar</button>
                            <button className="eco-primary-btn" onClick={handleSaveModule} style={{ padding: '8px 16px' }}>Guardar Módulo</button>
                        </div>
                    </div>
                </div>
            )}

            {showLessonForm && (
                <LessonEditor
                    lesson={editingLesson}
                    moduleNumber={editingModule?.module_number}
                    onClose={() => setShowLessonForm(false)}
                    onSaved={() => {
                        setShowLessonForm(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
