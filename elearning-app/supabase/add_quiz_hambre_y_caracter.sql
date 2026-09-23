-- ============================================================================
-- Quizzes: "Una vida de hambre por Jesús" (clase 8) y "Carácter de un cristiano" (clase 10)
-- Cada bloque busca su lección por título, agrega las preguntas con 4 opciones
-- (una correcta) y es idempotente: correrlo dos veces no duplica nada.
-- Correr en el SQL Editor de Supabase (saltea RLS).
--
-- Fuentes: notas de la clase en el doc maestro ECO (hambre: 4 principios y
-- versículos) y el programa ("Carácter: Fruto del Espíritu vs. obras de la
-- carne", Gálatas 5). Citas en NVI.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- A) Una vida de hambre por Jesús (4 preguntas)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_lesson_id uuid;
  v_match_count int;
  v_lesson_title text;
  v_q_id uuid;
BEGIN
  SELECT count(*) INTO v_match_count FROM public.lessons WHERE title ILIKE '%hambre%';
  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección que coincida con "%%hambre%%". Creala primero en el admin.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "%%hambre%%". Ajustá el filtro.', v_match_count;
  END IF;
  SELECT id, title INTO v_lesson_id, v_lesson_title FROM public.lessons WHERE title ILIKE '%hambre%' LIMIT 1;
  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;


  -- PREGUNTA 1
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'Según la clase, ¿dónde comienza el avivamiento?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'Según la clase, ¿dónde comienza el avivamiento?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'En los grandes eventos y campañas, cuando se junta mucha gente', false, 1),
      (v_q_id, 'En lo íntimo de tu casa: cuando cerrás la puerta para estar con Jesús, y después reflejás esa gloria donde te movés', true, 2),
      (v_q_id, 'Cuando el pastor o los líderes deciden que es tiempo de avivamiento', false, 3),
      (v_q_id, 'Cuando leés o escuchás sobre los avivamientos de la historia', false, 4);
  END IF;

  -- PREGUNTA 2
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = '¿Cuál es la barrera que la clase señala como la que hay que destruir para vivir con hambre por Jesús?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, '¿Cuál es la barrera que la clase señala como la que hay que destruir para vivir con hambre por Jesús?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'El confort: la comodidad del mundo cristiano, donde perdemos la visión de lo que fueron los avivamientos', true, 1),
      (v_q_id, 'La falta de recursos y de tiempo', false, 2),
      (v_q_id, 'No tener suficiente conocimiento bíblico', false, 3),
      (v_q_id, 'La oposición de la gente que no cree', false, 4);
  END IF;

  -- PREGUNTA 3
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'En Filipenses 3:7-8, ¿qué dice Pablo de todo lo que antes era ganancia para él?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'En Filipenses 3:7-8, ¿qué dice Pablo de todo lo que antes era ganancia para él?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que lo sigue valorando, pero ahora lo pone en segundo lugar', false, 1),
      (v_q_id, 'Que Dios se lo devolvió multiplicado por seguirlo', false, 2),
      (v_q_id, 'Que lo considera pérdida, y hasta basura, comparado con el incomparable valor de conocer a Cristo Jesús', true, 3),
      (v_q_id, 'Que fue un error haberlo tenido y por eso se arrepintió', false, 4);
  END IF;

  -- PREGUNTA 4
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'Según la clase, ¿cuáles son los tres vértices del avivamiento?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'Según la clase, ¿cuáles son los tres vértices del avivamiento?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Alabanza, ofrenda y evangelismo', false, 1),
      (v_q_id, 'Palabra, hambre e integridad', true, 2),
      (v_q_id, 'Oración, ayuno y milagros', false, 3),
      (v_q_id, 'Liderazgo, visión y estrategia', false, 4);
  END IF;

  RAISE NOTICE 'Listo. % preguntas cargadas para "%".', (SELECT count(*) FROM public.quiz_questions WHERE lesson_id = v_lesson_id), v_lesson_title;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- B) Carácter de un cristiano (4 preguntas)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_lesson_id uuid;
  v_match_count int;
  v_lesson_title text;
  v_q_id uuid;
BEGIN
  SELECT count(*) INTO v_match_count FROM public.lessons WHERE title ILIKE '%car_cter%';
  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección que coincida con "%%car_cter%%". Creala primero en el admin.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "%%car_cter%%". Ajustá el filtro.', v_match_count;
  END IF;
  SELECT id, title INTO v_lesson_id, v_lesson_title FROM public.lessons WHERE title ILIKE '%car_cter%' LIMIT 1;
  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;


  -- PREGUNTA 1
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'Según Gálatas 5:22-23, ¿cuál es el fruto del Espíritu?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'Según Gálatas 5:22-23, ¿cuál es el fruto del Espíritu?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Amor, alegría, paz, paciencia, amabilidad, bondad, fidelidad, humildad y dominio propio', true, 1),
      (v_q_id, 'Profecía, lenguas, sanidad, milagros, fe, sabiduría y discernimiento', false, 2),
      (v_q_id, 'Éxito, prosperidad, salud, buena reputación e influencia', false, 3),
      (v_q_id, 'Oración, ayuno, lectura bíblica, asistencia al culto y ofrenda', false, 4);
  END IF;

  -- PREGUNTA 2
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'Pablo habla de "fruto" en singular y no de "frutos". ¿Qué enseña eso sobre el carácter cristiano?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'Pablo habla de "fruto" en singular y no de "frutos". ¿Qué enseña eso sobre el carácter cristiano?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que cada cristiano elige el aspecto que mejor le sale y se concentra en ese', false, 1),
      (v_q_id, 'Que es un solo fruto con nueve aspectos que crecen juntos: es el carácter de Cristo formado por el Espíritu, no un logro personal', true, 2),
      (v_q_id, 'Que solo los líderes maduros tienen el fruto completo', false, 3),
      (v_q_id, 'Que el fruto aparece de golpe en el momento de la conversión', false, 4);
  END IF;

  -- PREGUNTA 3
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = 'Gálatas 5:16 dice: "Vivan por el Espíritu, y no seguirán los deseos de la carne". ¿Cómo se vence la carne según este versículo?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, 'Gálatas 5:16 dice: "Vivan por el Espíritu, y no seguirán los deseos de la carne". ¿Cómo se vence la carne según este versículo?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Con fuerza de voluntad y esfuerzo propio hasta lograrlo', false, 1),
      (v_q_id, 'Cumpliendo una lista de reglas cada vez más estricta', false, 2),
      (v_q_id, 'Caminando por el Espíritu: cuando el Espíritu llena y guía la vida, la carne pierde el control', true, 3),
      (v_q_id, 'Alejándose de toda persona que no sea cristiana', false, 4);
  END IF;

  -- PREGUNTA 4
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id AND question_text = '¿Cuáles de estas son obras de la carne según Gálatas 5:19-21?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id, '¿Cuáles de estas son obras de la carne según Gálatas 5:19-21?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;
    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Odio, discordia, celos, arrebatos de ira, rivalidades y envidia', true, 1),
      (v_q_id, 'Paciencia, amabilidad y fidelidad', false, 2),
      (v_q_id, 'Cansancio, tristeza y dudas', false, 3),
      (v_q_id, 'Tener amigos que no son cristianos', false, 4);
  END IF;

  RAISE NOTICE 'Listo. % preguntas cargadas para "%".', (SELECT count(*) FROM public.quiz_questions WHERE lesson_id = v_lesson_id), v_lesson_title;
END $$;
