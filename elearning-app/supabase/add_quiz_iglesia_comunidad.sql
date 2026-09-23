-- ============================================================================
-- Clase 12: "La iglesia como comunidad"
--  A) Carga la tarea (task_description) de la lección: "Mi lugar en el cuerpo".
--  B) Agrega 4 preguntas de opción múltiple (4 opciones, una correcta).
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
  WHERE title ILIKE '%comunidad%';

  IF v_match_count = 0 THEN
    RAISE EXCEPTION 'No se encontró ninguna lección con "comunidad" en el título. Creala primero desde el admin (Cursos) y volvé a correr esto.';
  ELSIF v_match_count > 1 THEN
    RAISE EXCEPTION 'Hay % lecciones que coinciden con "comunidad". Ajustá el filtro de título para elegir la correcta.', v_match_count;
  END IF;

  SELECT id, title INTO v_lesson_id, v_lesson_title
  FROM public.lessons
  WHERE title ILIKE '%comunidad%'
  LIMIT 1;

  RAISE NOTICE 'Lección encontrada: "%" (id=%)', v_lesson_title, v_lesson_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- A) TAREA: "Mi lugar en el cuerpo"
  -- ──────────────────────────────────────────────────────────────────────
  UPDATE public.lessons
  SET task_description =
'MI LUGAR EN EL CUERPO (15 días para entregar)

Esta tarea no se hace sentado: se hace en la iglesia. Tenés que subir UN solo archivo (foto, PDF o documento) con estas 4 partes:

1) SERVÍ UNA VEZ
Sumate al menos una vez a un área de la iglesia (recepción, niños, alabanza, técnica, limpieza, lo que haga falta). Subí una foto de ese momento o del área donde serviste y escribí en 3 líneas: qué hiciste y qué te pasó por dentro mientras servías.

2) UNA PERSONA NUEVA
Hablá con alguien del culto joven o de la iglesia con quien nunca hablaste. Anotá su nombre y UNA cosa que aprendiste de esa persona que no sabías (no vale "es simpático/a").

3) MI MAPA DEL CUERPO (1 Corintios 12)
Dibujá o escribí un cuerpo con 5 personas de la iglesia: al lado de cada una, qué aporta al cuerpo (por ejemplo: "Juli: siempre saluda al que llega solo"). Y en el medio, VOS: ¿qué parte del cuerpo estás ocupando hoy? Si todavía no ocupás ninguna, escribí cuál querés ocupar y a quién le vas a preguntar cómo sumarte.

4) EL VERSÍCULO
Escribí de memoria Hebreos 10:24-25 (NVI) y abajo, en una frase tuya, qué te dice a vos esta semana.

Se corrige por honestidad y por acción, no por prolijidad. Si algo no lo pudiste hacer, contá por qué: eso también es parte de la tarea.'
  WHERE id = v_lesson_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 1
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'La palabra griega para "iglesia" en el Nuevo Testamento es "ekklesía". Según la clase, ¿qué significa?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'La palabra griega para "iglesia" en el Nuevo Testamento es "ekklesía". Según la clase, ¿qué significa?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'El templo o edificio donde se reúnen los cristianos', false, 1),
      (v_q_id, 'Los llamados afuera, los convocados: la iglesia son las personas, no el lugar', true, 2),
      (v_q_id, 'La reunión del domingo a la que se asiste', false, 3),
      (v_q_id, 'El grupo de líderes y pastores que dirigen la congregación', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 2
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = '¿Qué fue lo primero que Dios dijo que "no es bueno" en toda la Biblia (Génesis 2:18), y por qué es importante para la clase?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            '¿Qué fue lo primero que Dios dijo que "no es bueno" en toda la Biblia (Génesis 2:18), y por qué es importante para la clase?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'El pecado de Adán, porque rompió la relación con Dios', false, 1),
      (v_q_id, 'Comer del árbol, porque mostró desobediencia', false, 2),
      (v_q_id, 'Que el hombre esté solo: lo dijo antes de la caída, así que fuimos diseñados para Dios y para otros', true, 3),
      (v_q_id, 'Que Caín matara a Abel, porque fue la primera pelea entre hermanos', false, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 3
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'Según Jesús en Juan 13:34-35, ¿por qué va a saber el mundo que somos sus discípulos?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'Según Jesús en Juan 13:34-35, ¿por qué va a saber el mundo que somos sus discípulos?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, 'Por los milagros y señales que hacemos', false, 1),
      (v_q_id, 'Por lo bien que conocemos la Biblia', false, 2),
      (v_q_id, 'Por nuestra alabanza y nuestros cultos', false, 3),
      (v_q_id, 'Por cómo nos amamos los unos a los otros, incluso a los que no elegimos', true, 4);
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- PREGUNTA 4
  -- ──────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_questions
                 WHERE lesson_id = v_lesson_id
                   AND question_text = 'La clase habla de dos maneras de estar en la iglesia: consumir o construir. ¿Cuál es la pregunta del que construye (1 Pedro 2:5, "piedras vivas")?') THEN
    INSERT INTO public.quiz_questions (lesson_id, question_text, question_order)
    VALUES (v_lesson_id,
            'La clase habla de dos maneras de estar en la iglesia: consumir o construir. ¿Cuál es la pregunta del que construye (1 Pedro 2:5, "piedras vivas")?',
            (SELECT COALESCE(MAX(question_order), 0) + 1 FROM public.quiz_questions WHERE lesson_id = v_lesson_id))
    RETURNING id INTO v_q_id;

    INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
      (v_q_id, '"¿Estuvo buena la predicación y la alabanza?"', false, 1),
      (v_q_id, '"¿Qué traigo, a quién puedo saludar que está solo, dónde hace falta una mano?"', true, 2),
      (v_q_id, '"¿Había gente conocida para sentarme?"', false, 3),
      (v_q_id, '"¿Qué me dio la iglesia este mes?"', false, 4);
  END IF;

  RAISE NOTICE 'Listo. Tarea y 4 preguntas cargadas para la lección "%".', v_lesson_title;
END $$;
