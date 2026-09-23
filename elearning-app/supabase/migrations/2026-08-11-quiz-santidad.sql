-- ============================================================
-- QUIZ: Santidad, pureza e integridad (clase del 12/8)
-- 4 preguntas, 4 opciones c/u, correcciones alineadas a la clase.
--
-- REQUISITO: la clase ya debe existir en el campus (crearla en
-- Panel Admin → Módulos si no está). El script la busca por título.
-- Pegar entero en el SQL Editor de Supabase y Run.
-- ============================================================

do $$
declare
  v_lesson uuid;
  v_q uuid;
begin
  select id into v_lesson
  from lessons
  where title ilike '%santidad%'
  order by created_at desc nulls last
  limit 1;

  if v_lesson is null then
    raise exception 'No encontre ninguna clase con "santidad" en el titulo. Creala primero en el panel admin y volve a correr esto.';
  end if;

  -- Evitar duplicados si se corre dos veces
  if exists (select 1 from quiz_questions where lesson_id = v_lesson) then
    raise exception 'Esta clase ya tiene quiz cargado (borralo primero si queres regenerarlo).';
  end if;

  -- ---------- Pregunta 1 · Principio 1 ----------
  insert into quiz_questions (lesson_id, question_text, question_order)
  values (v_lesson, '¿Qué significa realmente ser "santo"?', 1)
  returning id into v_q;

  insert into quiz_options (question_id, option_text, option_order, is_correct) values
    (v_q, 'Cumplir una lista de reglas para que Dios te acepte', 1, false),
    (v_q, 'Ser perfecto y no equivocarse nunca', 2, false),
    (v_q, 'Haber sido apartado para Dios y vivir desde esa identidad', 3, true),
    (v_q, 'Alejarse de todo y de todos para no contaminarse', 4, false);

  -- ---------- Pregunta 2 · Principio 2 ----------
  insert into quiz_questions (lesson_id, question_text, question_order)
  values (v_lesson, 'Según la clase, ¿dónde se gana la batalla de la pureza?', 2)
  returning id into v_q;

  insert into quiz_options (question_id, option_text, option_order, is_correct) values
    (v_q, 'En el momento de la tentación, aguantando con fuerza de voluntad', 1, false),
    (v_q, 'Antes: decidiendo qué dejo entrar por mis ojos y mi mente, como el pacto de Job', 2, true),
    (v_q, 'Cuando sea más grande y madure solo', 3, false),
    (v_q, 'Evitando hablar del tema para no tentarme', 4, false);

  -- ---------- Pregunta 3 · Principio 3 ----------
  insert into quiz_questions (lesson_id, question_text, question_order)
  values (v_lesson, '¿Qué es la integridad?', 3)
  returning id into v_q;

  insert into quiz_options (question_id, option_text, option_order, is_correct) values
    (v_q, 'No decir nunca una mentira', 1, false),
    (v_q, 'Ser serio y formal en todo momento', 2, false),
    (v_q, 'Tener buena reputación con los demás', 3, false),
    (v_q, 'Ser la misma persona en todos lados, también cuando nadie te ve', 4, true);

  -- ---------- Pregunta 4 · Principio 4 ----------
  insert into quiz_questions (lesson_id, question_text, question_order)
  values (v_lesson, '¿Qué hace la santidad verdadera después de una caída?', 4)
  returning id into v_q;

  insert into quiz_options (question_id, option_text, option_order, is_correct) values
    (v_q, 'Esconderse hasta sentirse digno de volver, como Adán', 1, false),
    (v_q, 'Rendirse: si caí es porque esto no es para mí', 2, false),
    (v_q, 'Compensar portándose doble de bien una semana', 3, false),
    (v_q, 'Volver rápido al Padre, confesar y buscar ayuda, como David', 4, true);

  raise notice 'Quiz cargado: 4 preguntas para la leccion %', v_lesson;
end $$;
