import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../contexts/SupabaseContext';
import { useUserProfile } from '../../../hooks/useSupabase';
import './QuizTab.css';

export default function QuizTab({ lessonId }) {
    const supabase = useSupabase();
    const { profile } = useUserProfile();

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionId: optionId }
    const [attempt, setAttempt] = useState(null); // null if not attempted, or the attempt object
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
                }

                // 2. Load questions and options
                const { data: questionsData, error: qErr } = await supabase
                    .from('quiz_questions')
                    .select('*, quiz_options(*)')
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
            alert('Por favor responde todas las preguntas antes de enviar.');
            return;
        }

        try {
            setSubmitting(true);

            // 1. Calculate Score
            let score = 0;
            const computedAnswers = questions.map(q => {
                const selectedOptId = answers[q.id];
                const selectedOpt = q.quiz_options.find(o => o.id === selectedOptId);
                const isCorrect = selectedOpt ? selectedOpt.is_correct : false;
                if (isCorrect) score++;

                return {
                    question_id: q.id,
                    selected_option_id: selectedOptId,
                    is_correct: isCorrect
                };
            });

            // 2. Save Attempt
            const { data: newAttempt, error: attemptError } = await supabase
                .from('quiz_attempts')
                .insert({
                    lesson_id: lessonId,
                    user_id: profile.id,
                    score,
                    max_score: questions.length
                })
                .select()
                .single();

            if (attemptError) throw attemptError;

            // 3. Save Answers (we attach attempt_id to each)
            const answersToInsert = computedAnswers.map(ans => ({
                ...ans,
                attempt_id: newAttempt.id
            }));

            await supabase.from('quiz_answers').insert(answersToInsert);

            // 4. Update Lesson Progress Global
            await supabase
                .from('lesson_progress')
                .upsert({
                    user_id: profile.id,
                    lesson_id: lessonId,
                    quiz_completed: true
                }, { onConflict: 'user_id,lesson_id' });

            // Refresh component state to show results
            const fullAttemptData = {
                ...newAttempt,
                quiz_answers: expectedAnswersFormat(computedAnswers)
            };

            setAttempt(fullAttemptData);

            // Add points logic? We can just alert for now.
            alert(`¡Quiz enviado! Tu resultado: ${score}/${questions.length}`);

        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert('Error enviando el quiz. Intentá de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper just to format the answers temporarily for state before reload next time
    const expectedAnswersFormat = (computed) => computed;

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
                                        // ReadOnly Mode (Results)
                                        const isSelected = userAnswer?.selected_option_id === opt.id;
                                        const isCorrect = opt.is_correct;

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
