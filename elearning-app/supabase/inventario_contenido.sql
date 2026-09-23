-- Inventario de contenido del campus ECO (solo lectura).
-- Correr en Supabase → SQL Editor. Devuelve una fila por lección con:
-- cantidad de preguntas del quiz, si tiene video, PDF, texto, tarea y qué recursos extra tiene.
select
  m.module_number                                   as modulo,
  l.lesson_number                                   as leccion,
  l.title                                           as titulo,
  l.available_from                                  as disponible_desde,
  (select count(*) from public.quiz_questions q
     where q.lesson_id = l.id)                      as preguntas_quiz,
  (l.youtube_video_id is not null
     or l.video_url is not null)                    as tiene_video,
  (l.pdf_guide_url is not null)                     as tiene_pdf_guia,
  length(coalesce(l.content_text, ''))              as largo_texto,
  (l.task_description is not null)                  as tiene_tarea,
  (select string_agg(r.resource_type || ': ' || r.title, ' | ' order by r.created_at)
     from public.lesson_resources r
     where r.lesson_id = l.id)                      as recursos_extra
from public.lessons l
join public.modules m on m.id = l.module_id
order by m.module_number, l.lesson_number;
