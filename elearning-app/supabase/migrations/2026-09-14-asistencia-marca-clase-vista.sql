-- ============================================================
-- ASISTENCIA PRESENCIAL = CLASE VISTA (2026-09-14)
--
-- Si un alumno figura "present" en la asistencia de una fecha, la
-- lección que se dio ese día queda marcada como video visto en
-- lesson_progress (video_completed = true, via_attendance = true).
-- Así aparece como vista en la matriz de progreso, en el perfil del
-- alumno y en el panel del alumno, sin tener que mirar el video.
--
-- Regla de emparejamiento fecha → lección:
--   se marcan TODAS las lecciones cuyo available_from cae dentro de
--   ±6 días de la fecha de la asistencia (las clases son cada 14 días,
--   así que la ventana nunca mezcla dos clases; si una noche tiene dos
--   lecciones, se marcan las dos). Lecciones sin available_from no se
--   emparejan: cargar la fecha de la clase en cada lección.
--
-- Si después la asistencia se cambia a ausente/justificado (o se
-- borra), se desmarca SOLO si la marca vino de la asistencia
-- (via_attendance = true). Si el alumno vio el video de verdad,
-- LessonView pone via_attendance = false y la marca queda.
--
-- CÓMO APLICAR: correr entero en el SQL Editor de Supabase. Es
-- idempotente. Al final hace el backfill de la asistencia ya cargada.
-- ============================================================

-- 1) Columna que distingue "vio el video" de "estuvo en la clase".
alter table public.lesson_progress
  add column if not exists via_attendance boolean not null default false;

-- 2) Lecciones que corresponden a una fecha de clase.
create or replace function public.lessons_for_class_date(p_date date)
returns setof uuid
language sql
stable
set search_path = public
as $$
  select l.id
  from public.lessons l
  where l.available_from is not null
    and l.available_from between p_date - 6 and p_date + 6;
$$;

-- 3) Marcar / desmarcar según la asistencia.
create or replace function public.apply_attendance_to_progress(
  p_user_id text,
  p_date date,
  p_present boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson uuid;
begin
  for v_lesson in select * from public.lessons_for_class_date(p_date) loop
    if p_present then
      insert into public.lesson_progress (user_id, lesson_id, video_completed, via_attendance, completed_at)
      values (p_user_id, v_lesson, true, true, (p_date::timestamp + interval '21 hours') at time zone 'America/Argentina/Buenos_Aires')
      on conflict (user_id, lesson_id) do update
        set video_completed = true,
            via_attendance  = case when public.lesson_progress.video_completed then public.lesson_progress.via_attendance else true end,
            completed_at    = coalesce(public.lesson_progress.completed_at, excluded.completed_at);
    else
      update public.lesson_progress
        set video_completed = false,
            via_attendance  = false,
            completed_at    = case when quiz_completed or assignment_submitted then completed_at else null end
      where user_id = p_user_id
        and lesson_id = v_lesson
        and via_attendance = true;
    end if;
  end loop;
end;
$$;

-- 4) Trigger en attendance.
create or replace function public.trg_attendance_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'present' then
      perform public.apply_attendance_to_progress(old.user_id, old.event_date, false);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.user_id <> new.user_id or old.event_date <> new.event_date) and old.status = 'present' then
    perform public.apply_attendance_to_progress(old.user_id, old.event_date, false);
  end if;

  perform public.apply_attendance_to_progress(new.user_id, new.event_date, new.status = 'present');
  return new;
end;
$$;

drop trigger if exists attendance_marks_lesson_seen on public.attendance;
create trigger attendance_marks_lesson_seen
  after insert or update or delete on public.attendance
  for each row execute function public.trg_attendance_progress();

-- 5) Backfill: toda la asistencia "present" ya cargada.
do $$
declare
  r record;
  n int := 0;
begin
  for r in select user_id, event_date from public.attendance where status = 'present' loop
    perform public.apply_attendance_to_progress(r.user_id, r.event_date, true);
    n := n + 1;
  end loop;
  raise notice 'Backfill listo: % registros de asistencia procesados', n;
end;
$$;

-- 6) Control: fechas de asistencia que no matchean ninguna lección
--    (si devuelve filas, falta cargar available_from en esa lección).
select a.event_date, count(*) as presentes_sin_leccion
from public.attendance a
where a.status = 'present'
  and not exists (select 1 from public.lessons_for_class_date(a.event_date))
group by a.event_date
order by a.event_date;
