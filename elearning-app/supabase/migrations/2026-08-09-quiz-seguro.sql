-- ============================================================
-- QUIZ SEGURO — corrección server-side (2026-08-09)
-- Problema: el cliente recibía is_correct antes de responder y
-- calculaba el score en el navegador (trampeable con DevTools).
--
-- CÓMO APLICAR (en este orden):
--   1. Ejecutar las secciones A y B en el SQL Editor de Supabase.
--   2. Deployar el frontend nuevo (QuizTab ya usa las RPCs).
--   3. Recién entonces ejecutar la sección C (revocar la columna).
--      Si se corre C antes del deploy, el quiz viejo deja de andar.
-- ============================================================

-- A) Enviar quiz: corrige, guarda intento + respuestas y devuelve el resultado.
create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := auth.jwt() ->> 'sub';  -- IDs de Clerk (text), no uuid
  v_attempt_id uuid;
  v_score int := 0;
  v_max int;
  v_row record;
  v_selected uuid;
  v_is_correct boolean;
  v_detail jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  -- un intento por lección
  if exists (select 1 from quiz_attempts where user_id = v_user and lesson_id = p_lesson_id) then
    raise exception 'Ya enviaste este quiz';
  end if;

  select count(*) into v_max from quiz_questions where lesson_id = p_lesson_id;
  if v_max = 0 then
    raise exception 'La lección no tiene quiz';
  end if;

  insert into quiz_attempts (lesson_id, user_id, score, max_score)
  values (p_lesson_id, v_user, 0, v_max)
  returning id into v_attempt_id;

  for v_row in
    select q.id as question_id
    from quiz_questions q
    where q.lesson_id = p_lesson_id
  loop
    v_selected := (p_answers ->> v_row.question_id::text)::uuid;

    select coalesce(o.is_correct, false) into v_is_correct
    from quiz_options o
    where o.id = v_selected and o.question_id = v_row.question_id;

    v_is_correct := coalesce(v_is_correct, false);
    if v_is_correct then v_score := v_score + 1; end if;

    insert into quiz_answers (attempt_id, question_id, selected_option_id, is_correct)
    values (v_attempt_id, v_row.question_id, v_selected, v_is_correct);

    v_detail := v_detail || jsonb_build_object(
      'question_id', v_row.question_id,
      'selected_option_id', v_selected,
      'is_correct', v_is_correct
    );
  end loop;

  update quiz_attempts set score = v_score where id = v_attempt_id;

  insert into lesson_progress (user_id, lesson_id, quiz_completed)
  values (v_user, p_lesson_id, true)
  on conflict (user_id, lesson_id) do update set quiz_completed = true;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'max_score', v_max,
    'answers', v_detail
  );
end;
$$;

grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- B) Revisión: qué opción era la correcta — SOLO si el alumno ya rindió.
create or replace function public.quiz_correct_options(p_lesson_id uuid)
returns table (question_id uuid, correct_option_id uuid)
language sql
security definer
set search_path = public
as $$
  select q.id, o.id
  from quiz_questions q
  join quiz_options o on o.question_id = q.id and o.is_correct
  where q.lesson_id = p_lesson_id
    and exists (
      select 1 from quiz_attempts a
      where a.lesson_id = p_lesson_id and a.user_id = (auth.jwt() ->> 'sub')
    );
$$;

grant execute on function public.quiz_correct_options(uuid) to authenticated;

-- C) ⚠️ EJECUTAR SOLO DESPUÉS DE DEPLOYAR EL FRONTEND NUEVO.
-- Bloquea la columna is_correct para clientes (un select * de quiz_options fallará;
-- el frontend nuevo ya pide columnas explícitas).
-- revoke select (is_correct) on public.quiz_options from authenticated, anon;
