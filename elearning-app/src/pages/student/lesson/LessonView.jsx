import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import AssignmentTab from './AssignmentTab';
import QuizTab from './QuizTab';
import YouTube from 'react-youtube';
import './LessonView.css';

export default function LessonView() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [searchParams] = useSearchParams();
    const assignmentRef = useRef(null);

    const [lesson, setLesson] = useState(null);
    const [resources, setResources] = useState([]);
    const [activeTab, setActiveTab] = useState('resources'); // 'resources', 'quiz', 'assignments'
    const [loading, setLoading] = useState(true);

    // Auto-scroll to assignment section when coming from a notification
    useEffect(() => {
        if (!loading && searchParams.get('scroll') === 'assignment' && assignmentRef.current) {
            setTimeout(() => assignmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
    }, [loading, searchParams]);

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

                // Initially mark as accessed, but NOT video_completed yet
                await supabase
                    .from('lesson_progress')
                    .upsert({
                        user_id: profile.id,
                        lesson_id: lessonId,
                        // only set completed_at if it's not set
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
                            <YouTube
                                videoId={lesson.youtube_video_id}
                                opts={{
                                    width: '100%',
                                    height: '100%',
                                    playerVars: {
                                        rel: 0,
                                        modestbranding: 1
                                    }
                                }}
                                onEnd={async () => {
                                    // Marcar video como visto
                                    await supabase
                                        .from('lesson_progress')
                                        .update({
                                            video_completed: true,
                                            completed_at: new Date().toISOString()
                                        })
                                        .eq('user_id', profile.id)
                                        .eq('lesson_id', lessonId);
                                }}
                                className="react-yt-container"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="no-video">No hay video configurado para esta lección</div>
                        )}
                    </div>

                    <div className="lesson-description">
                        <p>{lesson.content_text}</p>
                    </div>

                    {/* Tarea moved directly below video & description */}
                    <div ref={assignmentRef} className="lesson-assignment-section" style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid rgba(17,47,78,0.1)' }}>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#112F4E', marginBottom: '15px' }}>Tarea a entregar</h2>
                        <AssignmentTab
                            lessonId={lessonId}
                            taskDescription={lesson.task_description}
                        />
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

                        {activeTab === 'quiz' && (
                            <QuizTab lessonId={lessonId} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
