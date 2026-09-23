import React, { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Skeleton } from '../../components/Toast';
import { Link } from 'react-router-dom';
import './ModulesGrid.css';

export default function ModulesGrid() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadModules = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);

        try {
            const [modulesRes, progressRes] = await Promise.all([
                supabase
                    .from('modules')
                    .select('*')
                    .eq('is_active', true)
                    .order('module_number', { ascending: true }),
                supabase
                    .from('lesson_progress')
                    .select('lesson_id, video_completed')
                    .eq('user_id', profile.id),
            ]);

            if (modulesRes.error) throw modulesRes.error;
            if (progressRes.error) throw progressRes.error;

            const mods = modulesRes.data || [];
            const moduleIds = mods.map(m => m.id);

            // Clases de los módulos activos (para calcular el % client-side)
            let lessons = [];
            if (moduleIds.length > 0) {
                const lessonsRes = await supabase
                    .from('lessons')
                    .select('id, module_id')
                    .in('module_id', moduleIds);
                if (lessonsRes.error) throw lessonsRes.error;
                lessons = lessonsRes.data || [];
            }

            const completedIds = new Set(
                (progressRes.data || []).filter(p => p.video_completed).map(p => p.lesson_id)
            );

            const merged = mods.map(mod => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const total = modLessons.length;
                const done = modLessons.filter(l => completedIds.has(l.id)).length;
                return {
                    ...mod,
                    lessonsTotal: total,
                    lessonsDone: done,
                    progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
                    isCompleted: total > 0 && done === total,
                };
            });

            setModules(merged);
        } catch (err) {
            console.error('Error loading modules:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [profile, supabase]);

    useEffect(() => { loadModules(); }, [loadModules]);

    return (
        <div className="modules-page">
            <h1 className="page-title">Módulos de Formación</h1>
            <p className="page-subtitle">Avanzá paso a paso en tu trayecto ECO.</p>

            {loading ? (
                <div className="modules-grid">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="module-card">
                            <Skeleton height={180} style={{ borderRadius: 0 }} />
                            <div className="module-content">
                                <Skeleton height={14} width="35%" />
                                <Skeleton height={22} width="75%" style={{ marginTop: 12 }} />
                                <Skeleton lines={2} height={12} style={{ marginTop: 14 }} />
                                <Skeleton height={40} style={{ marginTop: 18 }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="modules-error">
                    <p className="modules-error-title">No pudimos cargar los módulos.</p>
                    <p className="modules-error-sub">Revisá tu conexión e intentá de nuevo.</p>
                    <button className="eco-primary-btn" onClick={loadModules}>Reintentar</button>
                </div>
            ) : modules.length === 0 ? (
                <div className="empty-state">
                    <p>Todavía no hay módulos publicados.</p>
                </div>
            ) : (
                <div className="modules-grid">
                    {modules.map(mod => (
                        <div key={mod.id} className="module-card">
                            <div className="module-image-container">
                                {mod.cover_image ? (
                                    <img src={mod.cover_image} alt={mod.title} className="module-cover" />
                                ) : (
                                    <div className="module-cover-placeholder">ECO</div>
                                )}
                                {mod.isCompleted && (
                                    <div className="completed-badge">✓ Completado</div>
                                )}
                            </div>

                            <div className="module-content">
                                <span className="module-number">Módulo {mod.module_number}</span>
                                <h3 className="module-title">{mod.title}</h3>
                                <p className="module-desc">{mod.description}</p>

                                <div className="module-progress">
                                    <div className="module-progress-bar">
                                        <div
                                            className="module-progress-fill"
                                            style={{ width: `${mod.progressPct}%` }}
                                        />
                                    </div>
                                    <span>{mod.progressPct}%</span>
                                </div>
                                <p className="module-progress-detail">
                                    {mod.lessonsTotal === 0
                                        ? 'Sin clases cargadas'
                                        : `${mod.lessonsDone} de ${mod.lessonsTotal} clases vistas`}
                                </p>

                                <Link to={`/dashboard/modules/${mod.id}`} className="eco-primary-btn module-btn">
                                    {mod.isCompleted ? 'Repasar' : 'Ingresar'}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
