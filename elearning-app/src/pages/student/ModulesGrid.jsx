import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { Link } from 'react-router-dom';
import './ModulesGrid.css';

export default function ModulesGrid() {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;

        let isMounted = true;

        async function loadModules() {
            try {
                if (!isMounted) return;
                setLoading(true);

                // Fetch all active modules AND user progress for those modules simultaneously
                const [modulesRes, progressRes] = await Promise.all([
                    supabase
                        .from('modules')
                        .select('*')
                        .eq('is_active', true)
                        .order('module_number', { ascending: true }),
                    supabase
                        .from('user_progress')
                        .select('module_id, status, progress_percentage')
                        .eq('user_id', profile.id)
                ]);

                if (modulesRes.error) throw modulesRes.error;

                // Merge progress data into modules array
                const mergedModules = modulesRes.data.map(mod => {
                    const modProgress = progressRes.data?.find(p => p.module_id === mod.id);
                    return {
                        ...mod,
                        status: modProgress?.status || 'in_progress',
                        progress_percentage: modProgress?.progress_percentage || 0
                    };
                });

                if (isMounted) setModules(mergedModules);

            } catch (err) {
                console.error('Error loading modules:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadModules();

        return () => { isMounted = false; };
    }, [profile, supabase]);

    if (loading) {
        return <div className="student-loading">Cargando módulos...</div>;
    }

    return (
        <div className="modules-page">
            <h1 className="page-title">Módulos de Formación</h1>
            <p className="page-subtitle">Avanzá paso a paso en tu trayecto ECO.</p>

            <div className="modules-grid">
                {modules.map(mod => (
                    <div key={mod.id} className={`module-card ${mod.status === 'locked' ? 'locked' : ''}`}>
                        <div className="module-image-container">
                            {mod.cover_image ? (
                                // Use a fallback image resolution path logic if needed, currently pointing to absolute root
                                <img src={`/${mod.cover_image}`} alt={mod.title} className="module-cover" />
                            ) : (
                                <div className="module-cover-placeholder">ECO</div>
                            )}
                            {mod.status === 'locked' && (
                                <div className="locked-overlay">
                                    <span>🔒 Bloqueado</span>
                                </div>
                            )}
                            {mod.status === 'completed' && (
                                <div className="completed-badge">✓ Completado</div>
                            )}
                        </div>

                        <div className="module-content">
                            <span className="module-number">Módulo {mod.module_number}</span>
                            <h3 className="module-title">{mod.title}</h3>
                            <p className="module-desc">{mod.description}</p>

                            <div className="module-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${mod.progress_percentage}%` }}
                                    ></div>
                                </div>
                                <span>{mod.progress_percentage}%</span>
                            </div>

                            {mod.status === 'locked' ? (
                                <button className="eco-secondary-btn" disabled>No disponible</button>
                            ) : (
                                <Link to={`/dashboard/modules/${mod.id}`} className="eco-primary-btn module-btn">
                                    {mod.status === 'completed' ? 'Repasar' : 'Ingresar'}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
