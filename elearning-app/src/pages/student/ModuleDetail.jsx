import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function ModuleDetail() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();
    const [module, setModule] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!moduleId) return;
        async function load() {
            const [modRes, lsnRes] = await Promise.all([
                supabase.from('modules').select('*').eq('id', moduleId).single(),
                supabase
                    .from('lessons')
                    .select('id, title, lesson_number, available_from, estimated_minutes')
                    .eq('module_id', moduleId)
                    .order('lesson_number', { ascending: true }),
            ]);
            setModule(modRes.data);
            setLessons(lsnRes.data || []);
            setLoading(false);
        }
        load();
    }, [moduleId, supabase]);

    if (loading) return <div className="student-loading">Cargando módulo...</div>;
    if (!module) return <div className="student-loading">Módulo no encontrado</div>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
            <button onClick={() => navigate(-1)} className="eco-secondary-btn" style={{ marginBottom: 24 }}>
                ← Volver a Módulos
            </button>

            <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#112F4E', marginBottom: 8 }}>
                Módulo {module.module_number}: {module.title}
            </h1>
            {module.description && (
                <p style={{ color: '#666', marginBottom: 32, fontSize: '0.97rem' }}>{module.description}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lessons.map(lesson => {
                    let isLocked = false;
                    let availableDateStr = '';
                    if (lesson.available_from) {
                        const [y, m, d] = lesson.available_from.split('-');
                        const availableDate = new Date(Number(y), Number(m) - 1, Number(d));
                        if (today < availableDate) {
                            isLocked = true;
                            availableDateStr = availableDate.toLocaleDateString('es-ES', {
                                day: 'numeric', month: 'long', year: 'numeric',
                            });
                        }
                    }

                    return (
                        <div
                            key={lesson.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: isLocked ? '#F8F9FA' : 'white',
                                border: `1px solid ${isLocked ? '#E0E0E0' : 'rgba(17,47,78,0.15)'}`,
                                borderRadius: 12,
                                padding: '16px 20px',
                                gap: 16,
                                opacity: isLocked ? 0.72 : 1,
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: '#112F4E', fontSize: '0.95rem' }}>
                                    {module.module_number}.{lesson.lesson_number} — {lesson.title}
                                </div>
                                {isLocked ? (
                                    <div style={{ fontSize: '0.82rem', color: '#BD4339', marginTop: 5, fontWeight: 600 }}>
                                        🔒 Se habilita el {availableDateStr}
                                    </div>
                                ) : lesson.estimated_minutes ? (
                                    <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 4 }}>
                                        ⏱ {lesson.estimated_minutes} min
                                    </div>
                                ) : null}
                            </div>

                            {isLocked ? (
                                <button
                                    disabled
                                    title={`Esta clase se habilita el ${availableDateStr}`}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: 8,
                                        border: '1px solid #E0E0E0',
                                        background: '#F0F0F0',
                                        color: '#AAA',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'not-allowed',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    No disponible
                                </button>
                            ) : (
                                <Link
                                    to={`/dashboard/lesson/${lesson.id}`}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: 8,
                                        background: '#BD4339',
                                        color: 'white',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    Ver clase →
                                </Link>
                            )}
                        </div>
                    );
                })}

                {lessons.length === 0 && (
                    <p style={{ color: '#888', textAlign: 'center', padding: 32 }}>
                        No hay clases cargadas en este módulo todavía.
                    </p>
                )}
            </div>
        </div>
    );
}
