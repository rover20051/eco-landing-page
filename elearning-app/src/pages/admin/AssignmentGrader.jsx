import { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useUserProfile } from '../../hooks/useSupabase';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import './AssignmentGrader.css';

// Extract the original filename from a Supabase storage URL
// Path format: userId/lessonId_originalName.ext
function getOriginalFilename(url) {
    if (!url) return 'archivo';
    try {
        const segment = decodeURIComponent(new URL(url).pathname.split('/').pop());
        // Strip the lessonId_ prefix (everything up to and including the first underscore after the UUID pattern)
        const match = segment.match(/^[^_]+_[^_]+_(.+)$/) || segment.match(/^[^_]+_(.+)$/);
        return match ? match[match.length - 1] : segment;
    } catch {
        return 'archivo';
    }
}

export default function AssignmentGrader() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const supabase = useSupabase();
    const { profile: currentUserProfile } = useUserProfile();
    const toast = useToast();

    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    // Filter state for list view
    const [filterStatus, setFilterStatus] = useState('all');

    // Grading form state
    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');

    // Bumped to force a reload after a fetch error
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function fetchAssignment() {
            try {
                setLoading(true);
                setFetchError(null);

                if (assignmentId) {
                    // --- SINGLE ASSIGNMENT: two separate queries to avoid FK ambiguity (PGRST201) ---
                    const { data: asgn, error: asgnError } = await supabase
                        .from('assignments')
                        .select('*, lessons(title, task_description, modules(module_number))')
                        .eq('id', assignmentId)
                        .single();

                    if (asgnError) throw asgnError;

                    // Fetch the submitter profile separately
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .eq('id', asgn.user_id)
                        .single();

                    if (isMounted) {
                        setAssignment({ ...asgn, profiles: profileData || null });
                        setGrade(asgn.grade !== null ? String(asgn.grade) : '');
                        setFeedback(asgn.feedback || '');
                    }
                } else {
                    // --- LIST VIEW: two separate queries to avoid FK ambiguity (PGRST201) ---
                    const { data: asgns, error: asgnsError } = await supabase
                        .from('assignments')
                        .select('*, lessons(title, modules(module_number))')
                        .order('status', { ascending: true })   // submitted before graded
                        .order('submitted_at', { ascending: false });

                    if (asgnsError) throw asgnsError;

                    // Fetch profiles for all unique submitters in one query
                    const userIds = [...new Set((asgns || []).map(a => a.user_id).filter(Boolean))];
                    let profilesMap = {};
                    if (userIds.length > 0) {
                        const { data: profilesData } = await supabase
                            .from('profiles')
                            .select('id, full_name, email')
                            .in('id', userIds);
                        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });
                    }

                    const enriched = (asgns || []).map(a => ({
                        ...a,
                        profiles: profilesMap[a.user_id] || null
                    }));

                    if (isMounted) setAssignment(enriched);
                }
            } catch (err) {
                console.error('Error fetching assignment(s):', err);
                if (isMounted) setFetchError('No se pudieron cargar las entregas. Intentá de nuevo en unos segundos.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAssignment();
        return () => { isMounted = false; };
    }, [assignmentId, supabase, reloadKey]);

    const handleGradeSubmit = async () => {
        if (grade === '') {
            toast.info('Debes seleccionar una evaluación.');
            return;
        }

        try {
            setSubmitting(true);
            const numericGrade = Number(grade);
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('assignments')
                .update({
                    grade: numericGrade,
                    feedback: feedback,
                    status: 'graded',
                    graded_at: now,
                    graded_by: currentUserProfile?.id || null,
                })
                .eq('id', assignmentId);

            if (error) throw error;

            // Send notification to the student
            if (assignment?.user_id) {
                const isApproved = numericGrade === 100;
                await supabase.from('notifications').insert({
                    user_id: assignment.user_id,
                    type: 'assignment_graded',
                    title: isApproved ? '✅ Tarea recibida y aprobada' : '📋 Tarea revisada',
                    message: isApproved
                        ? `Tu tarea "${assignment.lessons?.title}" fue recibida y aprobada.${feedback ? ' Feedback: ' + feedback : ''}`
                        : `Tu tarea "${assignment.lessons?.title}" fue revisada. ${feedback ? 'Feedback: ' + feedback : 'Por favor revisá los comentarios.'}`,
                    data: { assignment_id: assignmentId, lesson_id: assignment.lesson_id, grade: numericGrade }
                });
            }

            toast.success('¡Tarea calificada con éxito! El alumno fue notificado.');
            navigate('/admin/assignments');

        } catch (err) {
            console.error('Error updating grade:', err);
            toast.error('Error al guardar la calificación: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="admin-loading">Cargando entregas...</div>;

    // LIST VIEW
    if (!assignmentId) {
        const list = Array.isArray(assignment) ? assignment : [];
        const filtered = filterStatus === 'all' ? list : list.filter(a => a.status === filterStatus);
        const pendingCount = list.filter(a => a.status === 'submitted').length;

        return (
            <div className="assignment-grader">
                <h1 className="admin-page-title">Entregas de Tareas</h1>

                {fetchError && (
                    <div className="grader-error-box">
                        <strong>⚠️ No pudimos cargar las entregas</strong><br />
                        {fetchError}
                        <div>
                            <button className="eco-secondary-btn" onClick={() => setReloadKey(k => k + 1)} style={{ marginTop: '10px' }}>
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}

                <div className="grader-filter-bar">
                    <div className="grader-stats">
                        {pendingCount > 0 && (
                            <span className="pending-badge-count">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} de corrección</span>
                        )}
                    </div>
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('all')}
                        >
                            Todas ({list.length})
                        </button>
                        <button
                            className={`filter-tab ${filterStatus === 'submitted' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('submitted')}
                        >
                            Pendientes ({list.filter(a => a.status === 'submitted').length})
                        </button>
                        <button
                            className={`filter-tab ${filterStatus === 'graded' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('graded')}
                        >
                            Corregidas ({list.filter(a => a.status === 'graded').length})
                        </button>
                    </div>
                </div>

                {/* Desktop table — "Acción" is the first column and stays sticky so it
                    never scrolls out of view when the table scrolls horizontally. */}
                <div className="admin-table-container assignment-table-desktop">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th className="action-col">Acción</th>
                                <th>Estado</th>
                                <th>Alumno</th>
                                <th>Lección</th>
                                <th>Archivo</th>
                                <th>Fecha Entrega</th>
                                <th>Evaluación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => (
                                <tr key={a.id} className={a.status === 'submitted' ? 'row-pending' : ''}>
                                    <td className="action-col">
                                        <button
                                            className="eco-secondary-btn"
                                            onClick={() => navigate(`/admin/assignments/${a.id}`)}
                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                        >
                                            {a.status === 'submitted' ? 'Corregir' : 'Ver / Editar'}
                                        </button>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${a.status}`}>
                                            {a.status === 'submitted' ? 'Pendiente' : 'Corregida'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{a.profiles?.full_name}</td>
                                    <td>M{a.lessons?.modules?.module_number} – {a.lessons?.title}</td>
                                    <td>
                                        {a.file_url ? (
                                            <a
                                                href={a.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={getOriginalFilename(a.file_url)}
                                                className="file-link"
                                                title={getOriginalFilename(a.file_url)}
                                            >
                                                📄 {getOriginalFilename(a.file_url)}
                                            </a>
                                        ) : (
                                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Sin archivo</span>
                                        )}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('es-AR') : '—'}
                                    </td>
                                    <td>
                                        {a.status === 'graded' ? (
                                            <span className={`grade-pill ${a.grade === 100 ? 'approved' : 'rejected'}`}>
                                                {a.grade === 100 ? '✅ Recibida' : '❌ Incompleta'}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '0.85rem' }}>Sin calificar</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="admin-empty-state">
                            {filterStatus === 'submitted'
                                ? '¡Todo al día! No hay entregas pendientes de corrección.'
                                : 'No hay entregas registradas.'}
                        </div>
                    )}
                </div>

                {/* Mobile cards */}
                <div className="assignment-cards-mobile">
                    {filtered.map(a => (
                        <div key={a.id} className={`assignment-card ${a.status === 'submitted' ? 'row-pending' : ''}`}>
                            <div className="assignment-card-top">
                                <span className={`status-pill ${a.status}`}>
                                    {a.status === 'submitted' ? 'Pendiente' : 'Corregida'}
                                </span>
                                {a.status === 'graded' && (
                                    <span className={`grade-pill ${a.grade === 100 ? 'approved' : 'rejected'}`}>
                                        {a.grade === 100 ? '✅ Recibida' : '❌ Incompleta'}
                                    </span>
                                )}
                            </div>
                            <div className="assignment-card-student">{a.profiles?.full_name}</div>
                            <div className="assignment-card-lesson">M{a.lessons?.modules?.module_number} – {a.lessons?.title}</div>
                            <div className="assignment-card-meta">
                                <span>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('es-AR') : '—'}</span>
                                {a.file_url ? (
                                    <a
                                        href={a.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={getOriginalFilename(a.file_url)}
                                        className="file-link"
                                        title={getOriginalFilename(a.file_url)}
                                    >
                                        📄 {getOriginalFilename(a.file_url)}
                                    </a>
                                ) : (
                                    <span style={{ color: '#aaa' }}>Sin archivo</span>
                                )}
                            </div>
                            <button
                                className="eco-primary-btn assignment-card-action"
                                onClick={() => navigate(`/admin/assignments/${a.id}`)}
                            >
                                {a.status === 'submitted' ? 'Corregir' : 'Ver / Editar'}
                            </button>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="admin-empty-state">
                            {filterStatus === 'submitted'
                                ? '¡Todo al día! No hay entregas pendientes de corrección.'
                                : 'No hay entregas registradas.'}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // GRADING VIEW: single assignment
    if (!assignment || Array.isArray(assignment)) return <div>No se encontró la tarea.</div>;

    const isAlreadyGraded = assignment.status === 'graded';

    return (
        <div className="assignment-grader single-view">
            <div className="section-header">
                <button className="back-link" onClick={() => navigate('/admin/assignments')}>
                    ← Volver a Entregas
                </button>
                {isAlreadyGraded && (
                    <span className="graded-indicator">✅ Calificada el {new Date(assignment.graded_at).toLocaleDateString('es-AR')}</span>
                )}
            </div>

            <div className="grader-layout">
                {/* Left Side: Student Submission */}
                <div className="submission-content">
                    <div className="submission-header">
                        <h2>{assignment.lessons?.title}</h2>
                        <p className="student-name">Por: <strong>{assignment.profiles?.full_name}</strong></p>
                        <p className="submission-date">
                            Módulo {assignment.lessons?.modules?.module_number} · Entregado el{' '}
                            {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString('es-AR') : '—'}
                        </p>
                    </div>

                    {assignment.lessons?.task_description && (
                        <div className="task-description-box">
                            <h4>Consigna de la tarea:</h4>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{assignment.lessons.task_description}</p>
                        </div>
                    )}

                    {assignment.file_url ? (
                        <div className="file-submission-box">
                            <h4>📎 Archivo entregado por el alumno:</h4>
                            <a
                                href={assignment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={getOriginalFilename(assignment.file_url)}
                                className="eco-primary-btn"
                                style={{ display: 'inline-block', marginTop: '12px' }}
                            >
                                📄 {getOriginalFilename(assignment.file_url)}
                            </a>
                            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '8px' }}>
                                El archivo se abre en una nueva pestaña.
                            </p>
                        </div>
                    ) : (
                        <div className="no-file-box">
                            <p>⚠️ El alumno no adjuntó ningún archivo. Solo envió texto o la entrega está vacía.</p>
                            {assignment.content_text && (
                                <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: assignment.content_text }} />
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Grading Panel */}
                <div className="grading-panel">
                    <h3>{isAlreadyGraded ? 'Calificación guardada' : 'Calificar Entrega'}</h3>

                    <div className="form-group">
                        <label>Evaluación:</label>
                        <select
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="grade-select"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="100">✅ Aprobada / Entrega Finalizada</option>
                            <option value="0">❌ No Aprobada (Solicitar Reentrega)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Devolución al alumno (Opcional):</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Ej: Muy buen trabajo, la reflexión estuvo completa y bien desarrollada..."
                            rows={6}
                        />
                    </div>

                    <button
                        className="eco-primary-btn grade-btn"
                        onClick={handleGradeSubmit}
                        disabled={submitting || grade === ''}
                    >
                        {submitting ? 'Guardando...' : (isAlreadyGraded ? '💾 Actualizar Calificación' : '✅ Guardar Calificación')}
                    </button>

                    {isAlreadyGraded && (
                        <div className="already-graded-info">
                            <p>Calificación actual: <strong>{assignment.grade === 100 ? 'Recibida ✅' : 'No aprobada ❌'}</strong></p>
                            {assignment.feedback && (
                                <p>Feedback anterior: <em>{assignment.feedback}</em></p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
