import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import { useToast } from '../../../components/Toast';
import './QuizTab.css';

export default function QuizTab({ lessonId }) {
    const supabase = useSupabase();
    const { profile } = useUserProfile();
    const toast = useToast();

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionId: optionId }
    const [attempt, setAttempt] = useState(null); // null if not attempted, or the attempt object
    const [correctByQuestion, setCorrectByQuestion] = useState({}); // { questionId: correct_option_id } — solo tras rendir
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!profile || !lessonId) return;

        let isMounted = true;
        async function loadQuizData() {
            try {
                setLoading(true);

                // 1. Check if user already has an attempt
                const { data: attemptData, error: attemptErr } = await supabase
                    .from('quiz_attempts')
                    .select('*, quiz_answers(question_id, selected_option_id, is_correct)')
                    .eq('lesson_id', lessonId)
                    .eq('user_id', profile.id)
                    .single();

                if (attemptErr && attemptErr.code !== 'PGRST116') throw attemptErr;

                if (attemptData) {
                    if (isMounted) setAttempt(attemptData);
                    // Las respuestas correctas solo existen del lado del server;
                    // esta RPC las entrega únicamente si el alumno ya rindió.
                    const { data: correctRows } = await supabase
                        .rpc('quiz_correct_options', { p_lesson_id: lessonId });
                    if (isMounted && correctRows) {
                        setCorrectByQuestion(Object.fromEntries(
                            correctRows.map(r => [r.question_id, r.correct_option_id])
                        ));
                    }
                }

                // 2. Load questions and options — sin is_correct: la corrección vive en el server
                const { data: questionsData, error: qErr } = await supabase
                    .from('quiz_questions')
                    .select('id, lesson_id, question_text, question_order, quiz_options(id, question_id, option_text, option_order)')
                    .eq('lesson_id', lessonId)
                    .order('question_order', { ascending: true });

                if (qErr) throw qErr;

                // Sort options for each question
                const sortedQuestions = questionsData?.map(q => ({
                    ...q,
                    quiz_options: q.quiz_options.sort((a, b) => a.option_order - b.option_order)
                })) || [];

                if (isMounted) setQuestions(sortedQuestions);

            } catch (err) {
                console.error('Error loading quiz:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadQuizData();
        return () => { isMounted = false; };
    }, [lessonId, profile, supabase]);

    const handleOptionSelect = (questionId, optionId) => {
        if (attempt) return; // Disallow changes if already submitted
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        if (Object.keys(answers).length < questions.length) {
            toast.error('Respondé todas las preguntas antes de enviar.');
            return;
        }

        try {
            setSubmitting(true);

            // La corrección es 100% server-side: la RPC valida, puntúa,
            // guarda intento + respuestas y actualiza lesson_progress.
            const { data: result, error: rpcError } = await supabase
                .rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: answers });

            if (rpcError) throw rpcError;

            setAttempt({
                id: result.attempt_id,
                score: result.score,
                max_score: result.max_score,
                quiz_answers: result.answers
            });

            // Recién ahora el server revela cuáles eran las correctas (para la revisión)
            const { data: correctRows } = await supabase
                .rpc('quiz_correct_options', { p_lesson_id: lessonId });
            if (correctRows) {
                setCorrectByQuestion(Object.fromEntries(
                    correctRows.map(r => [r.question_id, r.correct_option_id])
                ));
            }

            toast.success(`¡Quiz enviado! Tu resultado: ${result.score}/${result.max_score}`);

        } catch (err) {
            console.error('Error submitting quiz:', err);
            toast.error('Error enviando el quiz. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="tab-loading">Cargando cuestionario...</div>;
    if (questions.length === 0) return <div>No hay cuestionario disponible para esta lección.</div>;

    return (
        <div className="quiz-tab">
            <div className="quiz-header">
                <h3>Repaso de Aprendizaje</h3>
                {attempt && (
                    <div className="quiz-score-badge">
                        Puntuación: {attempt.score} / {attempt.max_score}
                    </div>
                )}
            </div>

            <div className="quiz-questions">
                {questions.map((q, idx) => {
                    // If we have an attempt, find what the user answered for this question
                    const userAnswer = attempt?.quiz_answers?.find(a => a.question_id === q.id);

                    return (
                        <div key={q.id} className="quiz-question-card">
                            <h4>{idx + 1}. {q.question_text}</h4>
                            <div className="quiz-options">
                                {q.quiz_options.map(opt => {
                                    let optionClass = 'quiz-option';
                                    let icon = null;

                                    if (attempt) {
                                        // ReadOnly Mode (Results) — la correcta viene del server (RPC), no de la tabla
                                        const isSelected = userAnswer?.selected_option_id === opt.id;
                                        const isCorrect = correctByQuestion[q.id] === opt.id;

                                        if (isSelected && isCorrect) {
                                            optionClass += ' correct-selected';
                                            icon = '✅';
                                        } else if (isSelected && !isCorrect) {
                                            optionClass += ' wrong-selected';
                                            icon = '❌';
                                        } else if (isCorrect) {
                                            optionClass += ' correct-revealed';
                                            icon = '✅';
                                        }
                                    } else {
                                        // Interactive Mode
                                        if (answers[q.id] === opt.id) optionClass += ' selected';
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            className={optionClass}
                                            onClick={() => handleOptionSelect(q.id, opt.id)}
                                            disabled={!!attempt}
                                        >
                                            <div className="option-content">
                                                <span className="radio-circle">
                                                    {(answers[q.id] === opt.id || userAnswer?.selected_option_id === opt.id) && <div className="radio-fill" />}
                                                </span>
                                                <span className="option-text">{opt.option_text}</span>
                                            </div>
                                            {icon && <span className="result-icon">{icon}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!attempt && (
                <button
                    className="eco-primary-btn"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Enviando...' : 'Enviar Respuestas'}
                </button>
            )}
        </div>
    );
}
