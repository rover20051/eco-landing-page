import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import AssignmentTab from './AssignmentTab';
import QuizTab from './QuizTab';
import './LessonView.css';

export default function LessonView() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [lesson, setLesson] = useState(null);
    const [resources, setResources] = useState([]);
    const [activeTab, setActiveTab] = useState('resources'); // 'resources', 'quiz', 'assignments'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile || !lessonId) return;

        let isMounted = true;

        async function loadLesson() {
            try {
                setLoading(true);
                // 1. Fetch Lesson Data
                const { data: lessonData, error: lessonError } = await supabase
                    .from('lessons')
                    .select('*, modules (id, title, module_number)')
                    .eq('id', lessonId)
                    .single();

                if (lessonError) throw lessonError;

                // 2. Fetch Resources
                const { data: resData } = await supabase
                    .from('lesson_resources')
                    .select('*')
                    .eq('lesson_id', lessonId);

                // 3. Mark video as completed/accessed (simplified tracking for now)
                await supabase
                    .from('lesson_progress')
                    .upsert({
                        user_id: profile.id,
                        lesson_id: lessonId,
                        video_completed: true, // We mark as completed just by opening for now to keep parity with previous HTML
                        completed_at: new Date().toISOString()
                    }, { onConflict: 'user_id,lesson_id' });

                if (isMounted) {
                    setLesson(lessonData);
                    setResources(resData || []);
                }
            } catch (err) {
                console.error('Error loading lesson:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadLesson();
        return () => { isMounted = false; };
    }, [lessonId, profile, supabase]);

    if (loading) return <div className="student-loading">Cargando lección...</div>;
    if (!lesson) return <div className="student-loading">Lección no encontrada</div>;

    // Schedule lock logic (Buenos Aires timezone)
    const baDateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()); // "YYYY-MM-DD"
    const todayBA = new Date(`${baDateString}T00:00:00`);

    let isLocked = false;
    let availableDateStr = '';

    if (lesson.available_from) {
        const lessonDate = new Date(`${lesson.available_from}T00:00:00`);
        if (todayBA < lessonDate) {
            isLocked = true;
            availableDateStr = new Intl.DateTimeFormat('es-ES', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(lessonDate);
        }
    }

    if (isLocked) {
        return (
            <div className="lesson-view locked-screen" style={{ textAlign: 'center', padding: '100px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
                <h1 style={{ color: '#112F4E', fontFamily: 'Playfair Display' }}>Lección Bloqueada</h1>
                <p style={{ color: '#666', fontSize: '1.2rem', marginTop: '10px' }}>
                    Siguiendo el cronograma de ECO, esta lección estará disponible a partir del:<br />
                    <strong style={{ color: '#BD4339', display: 'block', marginTop: '15px', fontSize: '1.5rem' }}>{availableDateStr}</strong>
                </p>
                <button onClick={() => navigate(-1)} className="eco-secondary-btn" style={{ marginTop: '40px' }}>← Volver a los Módulos</button>
            </div>
        );
    }

    return (
        <div className="lesson-view">
            {/* Header */}
            <div className="lesson-header">
                <button onClick={() => navigate(-1)} className="back-btn">← Volver al Módulo</button>
                <span className="lesson-module-tag">Módulo {lesson.modules?.module_number}</span>
            </div>

            <div className="lesson-content-layout">
                {/* Left Side: Video & Content */}
                <div className="lesson-main">
                    <h1 className="lesson-title">{lesson.lesson_number}. {lesson.title}</h1>

                    <div className="video-container">
                        {lesson.youtube_video_id ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${lesson.youtube_video_id}?rel=0&modestbranding=1`}
                                title="Lesson Video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div className="no-video">No hay video configurado para esta lección</div>
                        )}
                    </div>

                    <div className="lesson-description">
                        <p>{lesson.content_text}</p>
                    </div>
                </div>

                {/* Right Side: Interactive Tabs */}
                <div className="lesson-sidebar">
                    <div className="tabs-header">
                        <button
                            className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
                            onClick={() => setActiveTab('resources')}
                        >
                            Recursos
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('assignments')}
                        >
                            Tareas
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                            onClick={() => setActiveTab('quiz')}
                        >
                            Quiz
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'resources' && (
                            <div className="resources-tab">
                                <h3>Recursos Descargables</h3>
                                {resources.length === 0 ? (
                                    <p>No hay recursos para esta lección.</p>
                                ) : (
                                    <ul className="resources-list">
                                        {resources.map(res => (
                                            <li key={res.id}>
                                                <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                                                    📄 {res.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {activeTab === 'assignments' && (
                            <AssignmentTab
                                lessonId={lessonId}
                                taskDescription={lesson.task_description}
                            />
                        )}

                        {activeTab === 'quiz' && (
                            <QuizTab lessonId={lessonId} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
