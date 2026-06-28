-- ============================================================================
-- Quiz: "Ayuno y Oración"
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
  -- 1) Buscar la lección de "Ayuno y Oración"
  SELECT count(*) INTO v_match_count
  FROM public.lessons
  WHERE title ILIKE '%ayuno%';

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección con "ayuno" en el título.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "ayuno". Ajustá el filtro de título para elegir la correcta.', v_match_count;
  END IF;

  SELECT id, title INTO v_lesson_id, v_lesson_title
  FROM public.lessons
  WHERE title ILIKE '%ayuno%'
  LIMIT 1;

  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 1
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según el principio número uno de la clase, ¿qué hace realmente la oración?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según el principio número uno de la clase, ¿qué hace realmente la oración?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Cambia la decisión de Dios si uno ora durante muchas horas seguidas', false, 1),
      (v_q_id, 'No transforma a Dios, sino que nos transforma a nosotros', true, 2),
      (v_q_id, 'Funciona como un intercambio: uno pide y obtiene lo que quiere', false, 3),
      (v_q_id, 'Sirve únicamente para pedirle cosas a Dios por nuestra familia', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 2
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'El orador insiste en que la oración no es transaccional. ¿Qué imágenes usa para explicarlo?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'El orador insiste en que la oración no es transaccional. ¿Qué imágenes usa para explicarlo?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que Dios es como un maestro que toma examen', false, 1),
      (v_q_id, 'Que la oración es una semilla que siempre da fruto inmediato', false, 2),
      (v_q_id, 'Que la oración "no le tuerce el brazo a Dios" y que Dios "no es un cajero automático"', true, 3),
      (v_q_id, 'Que orar es como llenar un formulario para recibir un premio', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 3
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Como aplicación práctica para descubrir el llamado, el orador propone hacerse cuatro preguntas en paralelo a la oración. ¿Cuál de estas NO es una de ellas?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Como aplicación práctica para descubrir el llamado, el orador propone hacerse cuatro preguntas en paralelo a la oración. ¿Cuál de estas NO es una de ellas?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, '¿Qué cosas hago bien?', false, 1),
      (v_q_id, '¿Dónde encuentro placer?', false, 2),
      (v_q_id, '¿Cuánto dinero puedo llegar a ganar?', true, 3),
      (v_q_id, '¿Qué ven los demás de mí?', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 4
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según el orador, ¿qué significa ser "terco en el espíritu" (en el buen sentido)?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según el orador, ¿qué significa ser "terco en el espíritu" (en el buen sentido)?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Insistir tercamente en que Dios cumpla mis propios deseos y planes', false, 1),
      (v_q_id, 'Negarse a escuchar la opinión de los líderes de la iglesia', false, 2),
      (v_q_id, 'Orar solamente cuando uno se siente emocionalmente bien', false, 3),
      (v_q_id, 'Guerrear en oración por lo que le mueve el corazón al Padre: las injusticias del mundo, los enfermos y el avivamiento', true, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 5
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Dentro de las cinco disciplinas para recuperar el clamor, ¿qué recomienda hacer al levantarse, en lugar de agarrar el celular?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Dentro de las cinco disciplinas para recuperar el clamor, ¿qué recomienda hacer al levantarse, en lugar de agarrar el celular?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Salir a caminar 30 minutos antes de desayunar', false, 1),
      (v_q_id, 'Declarar el Salmo 118:24 ("Este es el día que hizo el Señor, nos gozaremos y alegraremos en él")', true, 2),
      (v_q_id, 'Anotar los sueños de la noche en un cuaderno', false, 3),
      (v_q_id, 'Hacer un ayuno de comida hasta el mediodía', false, 4);
  END IF;

  RAISE NOTICE 'Listo. Preguntas del quiz cargadas para la lección "%".', v_lesson_title;
END $$;
