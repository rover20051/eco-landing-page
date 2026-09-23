import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Skeleton } from '../../components/Toast';
import './AdminDashboard.css';
import './QuizStats.css';

/* Trae todas las filas paginando de a 1000 (límite por defecto de Supabase). */
async function fetchAllRows(build) {
    const PAGE = 1000;
    let from = 0;
    const out = [];
    for (; ;) {
        const { data, error } = await build().range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return out;
}

export default function QuizStats() {
    const supabase = useSupabase();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const [expanded, setExpanded] = useState(() => new Set());

    const [questions, setQuestions] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [lessons, setLessons] = useState([]);

    const retry = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setLoading(true);
                setError(false);

                const [lessonsRes, questionRows, attemptRows, answerRows] = await Promise.all([
                    supabase
                        .from('lessons')
                        .select('id, title, lesson_number, modules(id, title, module_number)')
                        .order('lesson_number', { ascending: true }),
                    fetchAllRows(() => supabase
                        .from('quiz_questions')
                        .select('id, lesson_id, question_text, question_order')),
                    fetchAllRows(() => supabase
                        .from('quiz_attempts')
                        .select('id, user_id, lesson_id, score, max_score')),
                    fetchAllRows(() => supabase
                        .from('quiz_answers')
                        .select('question_id, is_correct'))
                ]);

                if (lessonsRes.error) throw lessonsRes.error;
                if (!isMounted) return;

                setLessons(lessonsRes.data || []);
                setQuestions(questionRows);
                setAttempts(attemptRows);
                setAnswers(answerRows);
            } catch (err) {
                console.error('Error cargando las estadísticas de quizzes:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => { isMounted = false; };
    }, [supabase, reloadToken]);

    const report = useMemo(() => {
        const lessonById = new Map(lessons.map(l => [l.id, l]));

        /* Errores por pregunta */
        const perQuestion = new Map();
        answers.forEach(a => {
            if (!a.question_id) return;
            const acc = perQuestion.get(a.question_id) || { total: 0, wrong: 0 };
            acc.total += 1;
            if (!a.is_correct) acc.wrong += 1;
            perQuestion.set(a.question_id, acc);
        });

        /* Intentos por lección */
        const perLessonAttempts = new Map();
        attempts.forEach(at => {
            const acc = perLessonAttempts.get(at.lesson_id) || { count: 0, ratioSum: 0, scored: 0, scoreSum: 0, maxSum: 0 };
            acc.count += 1;
            if (at.max_score) {
                acc.ratioSum += at.score / at.max_score;
                acc.scored += 1;
                acc.scoreSum += at.score;
                acc.maxSum += at.max_score;
            }
            perLessonAttempts.set(at.lesson_id, acc);
        });

        /* Agrupamos preguntas por lección */
        const byLesson = new Map();
        questions.forEach(q => {
            if (!q.lesson_id) return;
            if (!byLesson.has(q.lesson_id)) byLesson.set(q.lesson_id, []);
            byLesson.get(q.lesson_id).push(q);
        });

        const rows = [...byLesson.entries()].map(([lessonId, qs]) => {
            const lesson = lessonById.get(lessonId);
            const att = perLessonAttempts.get(lessonId) || { count: 0, ratioSum: 0, scored: 0, scoreSum: 0, maxSum: 0 };

            const questionStats = qs
                .map(q => {
                    const s = perQuestion.get(q.id) || { total: 0, wrong: 0 };
                    return {
                        id: q.id,
                        text: q.question_text,
                        order: q.question_order || 0,
                        total: s.total,
                        wrong: s.wrong,
                        errorRate: s.total > 0 ? (s.wrong / s.total) * 100 : null
                    };
                })
                .sort((a, b) => {
                    if (a.errorRate === null && b.errorRate === null) return a.order - b.order;
                    if (a.errorRate === null) return 1;
                    if (b.errorRate === null) return -1;
                    return b.errorRate - a.errorRate;
                });

            const answered = questionStats.reduce((s, q) => s + q.total, 0);
            const wrong = questionStats.reduce((s, q) => s + q.wrong, 0);
            const lessonErrorRate = answered > 0 ? (wrong / answered) * 100 : null;

            return {
                lessonId,
                lesson,
                questionCount: qs.length,
                attempts: att.count,
                avgPercent: att.scored > 0 ? Math.round((att.ratioSum / att.scored) * 100) : null,
                avgScore: att.scored > 0 ? att.scoreSum / att.scored : null,
                avgMax: att.scored > 0 ? att.maxSum / att.scored : null,
                questionStats,
                lessonErrorRate
            };
        });

        return rows.sort((a, b) => {
            if (a.lessonErrorRate === null && b.lessonErrorRate === null) {
                return (a.lesson?.lesson_number || 0) - (b.lesson?.lesson_number || 0);
            }
            if (a.lessonErrorRate === null) return 1;
            if (b.lessonErrorRate === null) return -1;
            return b.lessonErrorRate - a.lessonErrorRate;
        });
    }, [lessons, questions, attempts, answers]);

    const toggle = (lessonId) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(lessonId)) next.delete(lessonId);
            else next.add(lessonId);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="qs-page">
                <h1 className="admin-page-title">Estadísticas de quizzes</h1>
                {[0, 1, 2].map(i => (
                    <div key={i} className="qs-card" style={{ marginBottom: 14 }}>
                        <Skeleton height={20} width="55%" style={{ marginBottom: 12 }} />
                        <Skeleton lines={2} height={14} />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="qs-page">
                <h1 className="admin-page-title">Estadísticas de quizzes</h1>
                <div className="admin-error-banner">
                    <span>No pudimos cargar las estadísticas de quizzes.</span>
                    <button className="eco-secondary-btn" onClick={retry}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (report.length === 0) {
        return (
            <div className="qs-page">
                <h1 className="admin-page-title">Estadísticas de quizzes</h1>
                <div className="admin-empty-state">
                    Todavía no hay lecciones con preguntas de quiz. Cargá preguntas desde Módulos y acá vas a ver dónde se traban los alumnos.
                </div>
            </div>
        );
    }

    return (
        <div className="qs-page">
            <h1 className="admin-page-title" style={{ marginBottom: 8 }}>Estadísticas de quizzes</h1>
            <p className="qs-subtitle">
                Ordenado por porcentaje de error: arriba están los quizzes donde más se traban los alumnos.
            </p>

            <div className="qs-list">
                {report.map(row => {
                    const isOpen = expanded.has(row.lessonId);
                    const topFails = row.questionStats.filter(q => q.total > 0);
                    const visible = isOpen ? topFails : topFails.slice(0, 3);
                    return (
                        <div key={row.lessonId} className="qs-card">
                            <div className="qs-card-head">
                                <div className="qs-title-block">
                                    <h2>
                                        {row.lesson?.modules?.module_number != null && (
                                            <span className="mod-label">M{row.lesson.modules.module_number}</span>
                                        )}
                                        {row.lesson?.title || 'Lección sin título'}
                                    </h2>
                                    <span className="qs-question-count">
                                        {row.questionCount} pregunta{row.questionCount === 1 ? '' : 's'}
                                    </span>
                                </div>

                                <div className="qs-metrics">
                                    <div className="qs-metric">
                                        <span className="qs-metric-value">{row.attempts}</span>
                                        <span className="qs-metric-label">intentos</span>
                                    </div>
                                    <div className="qs-metric">
                                        <span className="qs-metric-value">
                                            {row.avgPercent === null ? '—' : `${row.avgPercent}%`}
                                        </span>
                                        <span className="qs-metric-label">
                                            {row.avgScore === null
                                                ? 'promedio'
                                                : `promedio ${row.avgScore.toFixed(1)}/${row.avgMax.toFixed(0)}`}
                                        </span>
                                    </div>
                                    <div className="qs-ring-wrap" title="Porcentaje de respuestas incorrectas">
                                        <svg viewBox="0 0 44 44" className="qs-ring">
                                            <circle cx="22" cy="22" r="18" className="qs-ring-bg" />
                                            <circle
                                                cx="22" cy="22" r="18"
                                                className={`qs-ring-fill ${errorClass(row.lessonErrorRate)}`}
                                                strokeDasharray={`${((row.lessonErrorRate || 0) / 100) * 113.1} 113.1`}
                                                transform="rotate(-90 22 22)"
                                            />
                                        </svg>
                                        <span className="qs-ring-label">
                                            {row.lessonErrorRate === null ? '—' : `${Math.round(row.lessonErrorRate)}%`}
                                        </span>
                                        <span className="qs-metric-label">error</span>
                                    </div>
                                </div>
                            </div>

                            {topFails.length === 0 ? (
                                <p className="qs-no-data">Nadie rindió este quiz todavía.</p>
                            ) : (
                                <>
                                    <h3 className="qs-fail-title">Preguntas más falladas</h3>
                                    <ul className="qs-fail-list">
                                        {visible.map(q => (
                                            <li key={q.id} className="qs-fail-item">
                                                <div className="qs-fail-text">{q.text}</div>
                                                <div className="qs-fail-bar-row">
                                                    <div className="qs-fail-bar">
                                                        <div
                                                            className={`qs-fail-bar-fill ${errorClass(q.errorRate)}`}
                                                            style={{ width: `${Math.round(q.errorRate || 0)}%` }}
                                                        />
                                                    </div>
                                                    <span className="qs-fail-pct">{Math.round(q.errorRate || 0)}% error</span>
                                                    <span className="qs-fail-count">{q.wrong}/{q.total}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    {topFails.length > 3 && (
                                        <button className="qs-toggle" onClick={() => toggle(row.lessonId)}>
                                            {isOpen ? 'Ver menos' : `Ver las ${topFails.length} preguntas`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function errorClass(rate) {
    if (rate === null || rate === undefined) return 'is-none';
    if (rate >= 50) return 'is-high';
    if (rate >= 25) return 'is-mid';
    return 'is-low';
}
