-- ============================================================================
-- Quiz: "Adoración"
-- Agrega 5 preguntas con 4 opciones cada una y su respuesta correcta.
-- Correr en el SQL Editor de Supabase (saltea RLS).
-- Es idempotente: si se corre dos veces, no duplica preguntas.
-- ============================================================================

DO $$
DECLARE
  v_lesson_id uuid;
  v_match_count int;
  v_lesson_title text;
  v_q_id uuid;
BEGIN
  -- 1) Buscar la lección de "Adoración"
  SELECT count(*) INTO v_match_count
  FROM public.lessons
  WHERE title ILIKE '%adoraci%';

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección con "adoraci" en el título.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "adoraci". Ajustá el filtro de título para elegir la correcta.', v_match_count;
  END IF;

  SELECT id, title INTO v_lesson_id, v_lesson_title
  FROM public.lessons
  WHERE title ILIKE '%adoraci%'
  LIMIT 1;

  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 1
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según la clase, ¿qué es la adoración entendida como "sacrificio vivo" (Romanos 12:1)?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según la clase, ¿qué es la adoración entendida como "sacrificio vivo" (Romanos 12:1)?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Solamente lo que hacen los músicos que dirigen los sábados y domingos', false, 1),
      (v_q_id, 'Nuestra vida entera: cómo tratamos a la familia, el servicio, las ofrendas, lo creativo, todo', true, 2),
      (v_q_id, 'Un momento puntual reservado para los campamentos y retiros', false, 3),
      (v_q_id, 'Cantar las canciones correctas con la actitud correcta', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 2
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'El orador cita que Jesús, hablando con la samaritana (Juan 4), dijo que el Padre busca algo en particular. ¿Qué busca?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'El orador cita que Jesús, hablando con la samaritana (Juan 4), dijo que el Padre busca algo en particular. ¿Qué busca?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'La música más maravillosa que se pueda crear', false, 1),
      (v_q_id, 'Que la gente asista al culto los domingos', false, 2),
      (v_q_id, 'Adoradores en espíritu y en verdad', true, 3),
      (v_q_id, 'Ofrendas generosas de tiempo y dinero', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 3
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'El orador usa el ejemplo de David recuperando el arca del pacto para enseñar uno de los principios. ¿Qué ilustra esa historia?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'El orador usa el ejemplo de David recuperando el arca del pacto para enseñar uno de los principios. ¿Qué ilustra esa historia?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que hay una única manera correcta de adorar', false, 1),
      (v_q_id, 'Que la adoración debe hacerse siempre en silencio y con reverencia', false, 2),
      (v_q_id, 'Que David adoró pensando en lo que el pueblo esperaba de él como rey', false, 3),
      (v_q_id, 'La adoración extravagante: David danza sin importarle el qué dirán, priorizando la presencia del Señor', true, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 4
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'El segundo principio es que la vida del creyente debe ser exclusiva de Jesús. Apoyándose en 2 Corintios 3:18 (reflejar como un espejo la gloria del Señor), ¿qué advierte el orador?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'El segundo principio es que la vida del creyente debe ser exclusiva de Jesús. Apoyándose en 2 Corintios 3:18 (reflejar como un espejo la gloria del Señor), ¿qué advierte el orador?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que reflejamos aquello que contemplamos: si llenamos el día con pornografía, apuestas o comparación, eso reflejaremos en vez de las cualidades de Cristo', true, 1),
      (v_q_id, 'Que solo los líderes pueden reflejar la gloria del Señor', false, 2),
      (v_q_id, 'Que el velo de Moisés todavía nos impide ver el rostro de Dios', false, 3),
      (v_q_id, 'Que basta con asistir a la iglesia para reflejar a Cristo', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 5
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = '¿A qué se refiere el orador cuando habla de una adoración que "ya no está dirigida por un hombre, sino por el mismo Espíritu"?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            '¿A qué se refiere el orador cuando habla de una adoración que "ya no está dirigida por un hombre, sino por el mismo Espíritu"?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'A que los músicos dejan de tocar y todo queda en completo silencio', false, 1),
      (v_q_id, 'A esos momentos íntimos y profundos donde no importa quién dirige ni si hubo una nota desafinada, porque todos son conscientes de la presencia de Dios', true, 2),
      (v_q_id, 'A que el director de alabanza debe tener años de formación musical', false, 3),
      (v_q_id, 'A que la congregación canta sin el acompañamiento de instrumentos', false, 4);
  END IF;

  RAISE NOTICE 'Listo. Preguntas del quiz cargadas para la lección "%".', v_lesson_title;
END $$;
