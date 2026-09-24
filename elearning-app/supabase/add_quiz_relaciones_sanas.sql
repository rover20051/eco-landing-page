-- ============================================================================
-- Clase 11: "Relaciones sanas" (miércoles 23 de septiembre de 2026)
--
--  A) Carga la tarea (task_description): "Mi mapa de relaciones", armada a
--     partir de las 9 preguntas del desafío semanal del PDF.
--  B) Agrega 5 preguntas de opción múltiple (4 opciones, una correcta), que
--     cubren la apertura (Mateo 22), el primer principio (el temor y el
--     "te elijo"), la comunicación (la suposición) y el tercero (los límites).
--
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
  -- 1) Buscar la lección
  SELECT count(*) INTO v_match_count
  FROM public.lessons
  WHERE title ILIKE '%relaciones%';

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección con "relaciones" en el título. Creala primero desde el admin (Cursos) y volvé a correr esto.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "relaciones". Ajustá el filtro de título para elegir la correcta.', v_match_count;
  END IF;

  SELECT id, title INTO v_lesson_id, v_lesson_title
  FROM public.lessons
  WHERE title ILIKE '%relaciones%'
  LIMIT 1;

  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- A) TAREA
  -- ──────────────────────────────────────────────────────────────────────
  UPDATE public.lessons
  SET task_description = 'MI MAPA DE RELACIONES (15 días para entregar)

Esta tarea sale de las preguntas del final de la clase. No hay respuestas correctas: se corrige por honestidad, no por prolijidad. Subí UN solo archivo (documento, foto de tu cuaderno o audio transcripto) con estas 5 partes.

1) EL ESPEJO
¿De dónde estoy sacando hoy mi sensación de valor y de importancia?
¿Hay alguna relación en la que siento que necesito demasiado la aprobación o la atención de la otra persona? ¿Qué podría empezar a cambiar?

2) A QUIÉN ELIJO
Escribí 3 personas que estás eligiendo para que formen parte de tu vida y por qué.
¿Qué características valorás en una amistad sana? Nombrá 3.

3) CÓMO REACCIONO (contá UNA situación real, reciente)
Cuando algo te molesta de alguien, ¿lo hablás o esperás que se dé cuenta solo?
¿Qué hacés cuando estás enojado: lo resolvés, te alejás, ignorás, respondés de una, intentás controlar al otro?
Contá una situación concreta de las últimas semanas: qué pasó, qué hiciste y qué efecto tuvo en esa relación.

4) DONDE SUPUSE
Pensá en una vez reciente en la que interpretaste lo que alguien hizo sin preguntarle qué le estaba pasando.
¿Qué supusiste? ¿Qué podría haber sido en realidad? ¿Cómo lo averiguarías?

5) MIS LÍMITES Y UNA CONVERSACIÓN
Escribí 2 límites que necesitás poner en tus relaciones, con el formato de la clase: "No voy a permitir…", "No voy a…".
Y esta es la parte que hay que HACER: elegí una conversación pendiente y tenela usando el modelo "me siento… cuando… y necesito…". Contá con quién fue, qué dijiste y cómo te fue. Si no te salió o no pudiste, contá por qué: eso también es parte de la tarea.'
  WHERE id = v_lesson_id;


  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 1
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según la clase, ¿por qué las relaciones son tan importantes para Dios?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según la clase, ¿por qué las relaciones son tan importantes para Dios?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Porque Jesús resumió toda la Ley y los Profetas en dos mandamientos: amar a Dios y amar al prójimo (Mateo 22:37-40)', true, 1),
      (v_q_id, 'Porque las relaciones son la única forma de crecer en la fe', false, 2),
      (v_q_id, 'Porque Dios pide que nos llevemos bien con todos sin excepción', false, 3),
      (v_q_id, 'Porque la iglesia funciona mejor cuando nadie discute', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 2
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'La clase dice que los conflictos en las relaciones se originan en el temor. Frente a ese temor, ¿qué solemos hacer?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'La clase dice que los conflictos en las relaciones se originan en el temor. Frente a ese temor, ¿qué solemos hacer?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Hablarlo enseguida con la otra persona', false, 1),
      (v_q_id, 'Huir, o intentar controlar a la otra persona', true, 2),
      (v_q_id, 'Pedirle consejo a un tercero antes de actuar', false, 3),
      (v_q_id, 'Esperar a que el tiempo lo resuelva solo', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 3
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según la clase, el fundamento de una relación sana es "te elijo" y no "vos me elegiste". ¿Por qué importa la diferencia?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según la clase, el fundamento de una relación sana es "te elijo" y no "vos me elegiste". ¿Por qué importa la diferencia?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Porque el que elige primero tiene más autoridad en la relación', false, 1),
      (v_q_id, 'Porque basar la relación en que el otro me eligió tiene el potencial de generar colapso: quedo esperando y me siento dejado de lado', true, 2),
      (v_q_id, 'Porque así se evita tener que poner límites más adelante', false, 3),
      (v_q_id, 'Porque las relaciones deberían empezar siempre por iniciativa de uno solo', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 4
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'La clase llama "la barrera de las relaciones" a una actitud concreta. ¿Cuál es, y qué propone en su lugar?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'La clase llama "la barrera de las relaciones" a una actitud concreta. ¿Cuál es, y qué propone en su lugar?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'El enojo; propone contar hasta diez antes de hablar', false, 1),
      (v_q_id, 'La indiferencia; propone escribirle todos los días a la otra persona', false, 2),
      (v_q_id, 'La suposición; propone comunicar lo que uno necesita, con el modelo "me siento… cuando… y necesito…"', true, 3),
      (v_q_id, 'La vergüenza; propone hablar de los problemas en grupo y no a solas', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 5
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Sobre los límites, ¿qué enseña el tercer principio de la clase?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Sobre los límites, ¿qué enseña el tercer principio de la clase?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Que hay que ponerlos ANTES de estar en la situación complicada, y que no son castigos sino señales de lo que a uno le importa', true, 1),
      (v_q_id, 'Que conviene ponerlos recién cuando la relación ya se volvió dañina', false, 2),
      (v_q_id, 'Que son una forma de castigar al otro hasta que cambie', false, 3),
      (v_q_id, 'Que si uno ama de verdad no necesita poner ningún límite', false, 4);
  END IF;

  RAISE NOTICE 'Listo. Tarea cargada y % preguntas en total para "%".',
    (SELECT count(*) FROM public.quiz_questions WHERE lesson_id = v_lesson_id), v_lesson_title;
END $$;
