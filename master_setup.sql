-- ==========================================
-- ECO E-Learning Database Schema (Master Setup)
-- INCLUYE CLERK AUTHENTICATION NATIVA Y ASISTENCIAS
-- Safe to run multiple times (Idempotent)
-- ==========================================

-- 0. Remover triggers viejos de Supabase Auth si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 1. Create custom enum types (safe if already exist)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'mentor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE module_status AS ENUM ('locked', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'graded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- PASO 1: DESTRUIR TODAS LAS POLÍTICAS RLS Y FK QUE DEPENDEN DE UUID
-- Esto es crítico para poder hacer el ALTER COLUMN de UUID a TEXT sin errores.
-- Ignoramos errores si la tabla aún no existe (undefined_table).
-- =========================================================================

DO $$ BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
    DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile via Clerk hook" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own profile CLERK" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles CLERK" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile CLERK" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile via Clerk app" ON public.profiles;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- User Progress
    DROP POLICY IF EXISTS "Users can view own progress." ON public.user_progress;
    DROP POLICY IF EXISTS "Users can update own progress." ON public.user_progress;
    DROP POLICY IF EXISTS "Users can insert own progress." ON public.user_progress;
    DROP POLICY IF EXISTS "Admins can view all progress." ON public.user_progress;
    DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can view own progress CLERK" ON public.user_progress;
    DROP POLICY IF EXISTS "Users can update own progress CLERK" ON public.user_progress;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Lesson Progress
    DROP POLICY IF EXISTS "Users can view own lesson progress." ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can insert own lesson progress." ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can update own lesson progress." ON public.lesson_progress;
    DROP POLICY IF EXISTS "Admins can view all lesson progress." ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.lesson_progress;
    DROP POLICY IF EXISTS "Admins can view all lesson progress" ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can view own lesson progress CLERK" ON public.lesson_progress;
    DROP POLICY IF EXISTS "Users can update own lesson progress CLERK" ON public.lesson_progress;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Assignments
    DROP POLICY IF EXISTS "Users can view own assignments." ON public.assignments;
    DROP POLICY IF EXISTS "Users can insert own assignments." ON public.assignments;
    DROP POLICY IF EXISTS "Mentors can view all assignments." ON public.assignments;
    DROP POLICY IF EXISTS "Mentors can grade assignments." ON public.assignments;
    DROP POLICY IF EXISTS "Users can view own assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Users can insert own assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Mentors can view all assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Mentors can grade assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Admins and mentors view all assignments CLERK" ON public.assignments;
    DROP POLICY IF EXISTS "Users can view own assignments CLERK" ON public.assignments;
    DROP POLICY IF EXISTS "Users can insert own assignments CLERK" ON public.assignments;
    DROP POLICY IF EXISTS "Users can update own assignments CLERK" ON public.assignments;
    DROP POLICY IF EXISTS "Admins and Mentors update assignments CLERK" ON public.assignments;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Quiz Attempts
    DROP POLICY IF EXISTS "Users can view own quiz attempts." ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can insert own quiz attempts." ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Admins can view all quiz attempts." ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can view own quiz attempts CLERK" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can insert own quiz attempts CLERK" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Admins can view all quiz attempts CLERK" ON public.quiz_attempts;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Quiz Answers
    DROP POLICY IF EXISTS "Users can view own quiz answers." ON public.quiz_answers;
    DROP POLICY IF EXISTS "Users can insert own quiz answers." ON public.quiz_answers;
    DROP POLICY IF EXISTS "Admins can view all quiz answers." ON public.quiz_answers;
    DROP POLICY IF EXISTS "Users can view own quiz answers" ON public.quiz_answers;
    DROP POLICY IF EXISTS "Users can insert own quiz answers" ON public.quiz_answers;
    DROP POLICY IF EXISTS "Admins can view all quiz answers" ON public.quiz_answers;
    DROP POLICY IF EXISTS "Users can view own quiz answers CLERK" ON public.quiz_answers;
    DROP POLICY IF EXISTS "Users can insert own quiz answers CLERK" ON public.quiz_answers;
    DROP POLICY IF EXISTS "Admins can view all quiz answers CLERK" ON public.quiz_answers;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Attendance
    DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Admins and Mentors can manage attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Users can view their own attendance CLERK" ON public.attendance;
    DROP POLICY IF EXISTS "Admins and Mentors can manage attendance CLERK" ON public.attendance;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Notifications
    DROP POLICY IF EXISTS "Users can view their own notifications CLERK" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications CLERK" ON public.notifications;
    DROP POLICY IF EXISTS "Admins can insert notifications CLERK" ON public.notifications;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Lesson Resources
    DROP POLICY IF EXISTS "Lesson resources are viewable by authenticated users." ON public.lesson_resources;
    DROP POLICY IF EXISTS "Admins can manage lesson resources." ON public.lesson_resources;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Modules
    DROP POLICY IF EXISTS "Anyone can view active modules" ON public.modules;
    DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
    DROP POLICY IF EXISTS "Anyone can view active modules CLERK" ON public.modules;
    DROP POLICY IF EXISTS "Admins can manage modules CLERK" ON public.modules;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Lessons
    DROP POLICY IF EXISTS "Anyone can view lessons of active modules" ON public.lessons;
    DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
    DROP POLICY IF EXISTS "Anyone can view active lessons CLERK" ON public.lessons;
    DROP POLICY IF EXISTS "Admins can manage lessons CLERK" ON public.lessons;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Quiz Questions
    DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users." ON public.quiz_questions;
    DROP POLICY IF EXISTS "Admins can manage quiz questions." ON public.quiz_questions;
    DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users CLERK" ON public.quiz_questions;
    DROP POLICY IF EXISTS "Admins can manage quiz questions CLERK" ON public.quiz_questions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Quiz Options
    DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users." ON public.quiz_options;
    DROP POLICY IF EXISTS "Admins can manage quiz options." ON public.quiz_options;
    DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users CLERK" ON public.quiz_options;
    DROP POLICY IF EXISTS "Admins can manage quiz options CLERK" ON public.quiz_options;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    -- Storage Objects (Dependen de perfiles)
    DROP POLICY IF EXISTS "Students can upload assignments" ON storage.objects;
    DROP POLICY IF EXISTS "Students can view own assignments" ON storage.objects;
    DROP POLICY IF EXISTS "Admins and Mentors can view all assignments" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can manage lesson resources storage" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated can view lesson resources" ON storage.objects;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Optional: Drop the foreign keys before altering columns
ALTER TABLE IF EXISTS public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;
ALTER TABLE IF EXISTS public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;
ALTER TABLE IF EXISTS public.assignments DROP CONSTRAINT IF EXISTS assignments_user_id_fkey;
ALTER TABLE IF EXISTS public.assignments DROP CONSTRAINT IF EXISTS assignments_graded_by_fkey;
ALTER TABLE IF EXISTS public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE IF EXISTS public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;


-- =========================================================================
-- PASO 2: CREACIÓN DE TABLAS BASE Y ALTERACIÓN DE UUID A TEXT
-- =========================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    role user_role DEFAULT 'student'::user_role,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    eco_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
  -- Existing users (already in the system) should be approved
  UPDATE public.profiles SET status = 'approved' WHERE status IS NULL OR status = 'pending';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Aseguramos que la columna email exista, porque el frontend la requiere
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Forzamos id a que sea texto si no lo era (ignoramos si ya es TEXT o hay dependencias)
DO $$ BEGIN
  ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Modules
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    module_number INTEGER NOT NULL UNIQUE,
    cover_image TEXT,
    is_active BOOLEAN DEFAULT true,
    unlock_after_module_id UUID REFERENCES public.modules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_number INTEGER NOT NULL,
    video_url TEXT,
    youtube_video_id TEXT,
    content_text TEXT,
    estimated_minutes INTEGER,
    pdf_guide_url TEXT,
    task_description TEXT,
    available_from DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(module_id, lesson_number)
);
ALTER TABLE IF EXISTS public.lessons ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE IF EXISTS public.lessons ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE IF EXISTS public.lessons ADD COLUMN IF NOT EXISTS task_description TEXT;
ALTER TABLE IF EXISTS public.lessons ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE IF EXISTS public.lessons ADD COLUMN IF NOT EXISTS pdf_guide_url TEXT;

-- Lesson Resources
CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    resource_type TEXT DEFAULT 'pdf',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Progress (Module level)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    status module_status DEFAULT 'locked'::module_status,
    progress_percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, module_id)
);
ALTER TABLE IF EXISTS public.user_progress ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Lesson Progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    video_completed BOOLEAN DEFAULT false,
    quiz_completed BOOLEAN DEFAULT false,
    assignment_submitted BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, lesson_id)
);
ALTER TABLE IF EXISTS public.lesson_progress ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_text TEXT,
    file_url TEXT,
    status assignment_status DEFAULT 'submitted'::assignment_status,
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(lesson_id, user_id)
);

-- Asegurar que las columnas existan antes de alterar el tipo (para BD viejas)
DO $$ BEGIN
  ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS graded_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.assignments ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE IF EXISTS public.assignments ALTER COLUMN graded_by TYPE TEXT USING graded_by::text;

-- Quiz Questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz Options
CREATE TABLE IF NOT EXISTS public.quiz_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    option_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE IF EXISTS public.quiz_attempts ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Quiz Answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.quiz_options(id),
    is_correct BOOLEAN DEFAULT false
);

-- Attendance (Asistencias)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, event_date)
);
ALTER TABLE IF EXISTS public.attendance ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- =========================================================================
-- PASO 3: RE-STABLECER CONSTRAINTS DE LLAVES FORÁNEAS DE CLERK (TEXT)
-- =========================================================================
ALTER TABLE IF EXISTS public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;
ALTER TABLE IF EXISTS public.user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;
ALTER TABLE IF EXISTS public.lesson_progress ADD CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.assignments DROP CONSTRAINT IF EXISTS assignments_user_id_fkey;
ALTER TABLE IF EXISTS public.assignments ADD CONSTRAINT assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.assignments DROP CONSTRAINT IF EXISTS assignments_graded_by_fkey;
ALTER TABLE IF EXISTS public.assignments ADD CONSTRAINT assignments_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE IF EXISTS public.quiz_attempts ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE IF EXISTS public.attendance ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- IMPORTANTE: Constraints para habilitar la función de UPSERT correcta
-- 1. Eliminar filas duplicadas primero para que postgres no lance UNIQUE_VIOLATION
DO $$ BEGIN
    DELETE FROM public.assignments a WHERE a.id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY lesson_id, user_id ORDER BY submitted_at DESC) as rn FROM public.assignments
        ) t WHERE t.rn = 1
    );
    ALTER TABLE IF EXISTS public.assignments DROP CONSTRAINT IF EXISTS assignments_lesson_id_user_id_key;
    ALTER TABLE IF EXISTS public.assignments ADD CONSTRAINT assignments_lesson_id_user_id_key UNIQUE (lesson_id, user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DELETE FROM public.lesson_progress a WHERE a.id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, lesson_id ORDER BY created_at DESC) as rn FROM public.lesson_progress
        ) t WHERE t.rn = 1
    );
    ALTER TABLE IF EXISTS public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_key;
    ALTER TABLE IF EXISTS public.lesson_progress ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DELETE FROM public.attendance a WHERE a.id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, event_date ORDER BY created_at DESC) as rn FROM public.attendance
        ) t WHERE t.rn = 1
    );
    ALTER TABLE IF EXISTS public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_event_date_key;
    ALTER TABLE IF EXISTS public.attendance ADD CONSTRAINT attendance_user_id_event_date_key UNIQUE (user_id, event_date);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DELETE FROM public.user_progress a WHERE a.id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, module_id ORDER BY last_accessed DESC) as rn FROM public.user_progress
        ) t WHERE t.rn = 1
    );
    ALTER TABLE IF EXISTS public.user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_module_id_key;
    ALTER TABLE IF EXISTS public.user_progress ADD CONSTRAINT user_progress_user_id_module_id_key UNIQUE (user_id, module_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- =========================================================================
-- PASO 4: FUNCIONES HELPER (SECURITY DEFINER)
-- Definidas antes de las políticas para evitar errores de referencia.
-- Usan SECURITY DEFINER para omitir RLS al consultar profiles internamente.
-- =========================================================================

-- ¿Es el usuario actual un admin?
CREATE OR REPLACE FUNCTION public.is_admin_clerk()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _result boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = coalesce(auth.jwt()->>'sub', '') AND role::text = 'admin'
  ) INTO _result;
  RETURN coalesce(_result, false);
END;
$$;

-- ¿Es el usuario actual admin o mentor?
CREATE OR REPLACE FUNCTION public.is_admin_or_mentor_clerk()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _result boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = coalesce(auth.jwt()->>'sub', '') AND role::text IN ('admin', 'mentor')
  ) INTO _result;
  RETURN coalesce(_result, false);
END;
$$;

-- ¿Tiene el usuario actual status = 'approved'?
-- Bloquea a usuarios pending/rejected de acceder a datos del curso.
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _result boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = coalesce(auth.jwt()->>'sub', '') AND status = 'approved'
  ) INTO _result;
  RETURN coalesce(_result, false);
END;
$$;


-- =========================================================================
-- PASO 5: POLÍTICAS RLS — HARDENED
-- Corrige:
--   (a) Lectura anónima: solo auth.role()='authenticated' accede a datos
--   (b) Operaciones anónimas: políticas explícitas para INSERT/UPDATE/DELETE
--   (c) Usuarios pending: check de is_approved_user() en tablas de contenido
--   (d) Escalada de privilegios: ver trigger en PASO 7
-- =========================================================================

-- Notifications table (creada aquí si no existe, antes de sus políticas)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('class_unlocked', 'assignment_graded', 'attendance')),
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile via Clerk hook" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile CLERK" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles CLERK" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile CLERK" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile via Clerk app" ON profiles;
DROP POLICY IF EXISTS "Admins y Mentors can view all profiles CLERK" ON profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Approved users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- SELECT propio: cualquier autenticado puede ver SU perfil (necesario para página "cuenta pendiente")
CREATE POLICY "Users can view own profile CLERK" ON profiles
  FOR SELECT USING (auth.jwt()->>'sub' = id);

-- SELECT todos: solo usuarios aprobados (rankings, listas de alumnos, gestión admin)
-- NOTA: is_approved_user() usa SECURITY DEFINER → no hay recursión infinita
CREATE POLICY "Approved users can read all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated' AND public.is_approved_user());

-- INSERT: al registrarse se crea el propio perfil (inicia en 'pending')
CREATE POLICY "Users can insert own profile via Clerk app" ON profiles
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = id);

-- UPDATE propio: campos seguros solamente (role/status/eco_points bloqueados por trigger PASO 7)
CREATE POLICY "Users can update own profile CLERK" ON profiles
  FOR UPDATE USING (auth.jwt()->>'sub' = id)
  WITH CHECK (auth.jwt()->>'sub' = id);

-- UPDATE admin: admins y mentors pueden actualizar cualquier perfil (aprobar, cambiar rol)
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.is_admin_or_mentor_clerk());

-- DELETE: solo admins
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- MODULES
-- -------------------------------------------------------------------------
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Anyone can view active modules CLERK" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules CLERK" ON modules;

CREATE POLICY "Approved users can view active modules" ON modules
  FOR SELECT USING (is_active = true AND public.is_approved_user());

CREATE POLICY "Admins can manage modules CLERK" ON modules
  FOR ALL USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- LESSONS
-- -------------------------------------------------------------------------
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view lessons of active modules" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can view active lessons CLERK" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons CLERK" ON lessons;

CREATE POLICY "Approved users can view active lessons" ON lessons
  FOR SELECT USING (
    public.is_approved_user() AND
    EXISTS (SELECT 1 FROM modules WHERE modules.id = lessons.module_id AND modules.is_active = true)
  );

CREATE POLICY "Admins can manage lessons CLERK" ON lessons
  FOR ALL USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- LESSON RESOURCES
-- -------------------------------------------------------------------------
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lesson resources are viewable by authenticated users." ON lesson_resources;
DROP POLICY IF EXISTS "Admins can manage lesson resources." ON lesson_resources;

CREATE POLICY "Approved users can view lesson resources" ON lesson_resources
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Admins can manage lesson resources." ON lesson_resources
  FOR ALL USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- USER PROGRESS
-- -------------------------------------------------------------------------
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress." ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress." ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress." ON user_progress;
DROP POLICY IF EXISTS "Admins can view all progress." ON user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON user_progress;
DROP POLICY IF EXISTS "Users can view own progress CLERK" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress CLERK" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress CLERK" ON user_progress;

CREATE POLICY "Users can view own progress CLERK" ON user_progress
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

-- INSERT y UPDATE separados (sin DELETE para estudiantes)
CREATE POLICY "Users can insert own progress CLERK" ON user_progress
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Users can update own progress CLERK" ON user_progress
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Admins can view all progress" ON user_progress
  FOR SELECT USING (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- LESSON PROGRESS
-- -------------------------------------------------------------------------
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lesson progress." ON lesson_progress;
DROP POLICY IF EXISTS "Users can insert own lesson progress." ON lesson_progress;
DROP POLICY IF EXISTS "Users can update own lesson progress." ON lesson_progress;
DROP POLICY IF EXISTS "Admins can view all lesson progress." ON lesson_progress;
DROP POLICY IF EXISTS "Users can view own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can insert own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can update own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can view own lesson progress CLERK" ON lesson_progress;
DROP POLICY IF EXISTS "Users can update own lesson progress CLERK" ON lesson_progress;
DROP POLICY IF EXISTS "Users can insert own lesson progress CLERK" ON lesson_progress;

CREATE POLICY "Users can view own lesson progress CLERK" ON lesson_progress
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

-- INSERT y UPDATE separados (sin DELETE para estudiantes)
CREATE POLICY "Users can insert own lesson progress CLERK" ON lesson_progress
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Users can update own lesson progress CLERK" ON lesson_progress
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Admins can view all lesson progress" ON lesson_progress
  FOR SELECT USING (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- ASSIGNMENTS
-- -------------------------------------------------------------------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignments." ON assignments;
DROP POLICY IF EXISTS "Users can insert own assignments." ON assignments;
DROP POLICY IF EXISTS "Mentors can view all assignments." ON assignments;
DROP POLICY IF EXISTS "Mentors can grade assignments." ON assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Mentors can view all assignments" ON assignments;
DROP POLICY IF EXISTS "Mentors can grade assignments" ON assignments;
DROP POLICY IF EXISTS "Admins and mentors view all assignments CLERK" ON assignments;
DROP POLICY IF EXISTS "Users can view own assignments CLERK" ON assignments;
DROP POLICY IF EXISTS "Users can insert own assignments CLERK" ON assignments;
DROP POLICY IF EXISTS "Users can update own assignments CLERK" ON assignments;
DROP POLICY IF EXISTS "Admins and Mentors update assignments CLERK" ON assignments;

CREATE POLICY "Admins and mentors view all assignments CLERK" ON assignments
  FOR SELECT USING (public.is_admin_or_mentor_clerk());

CREATE POLICY "Users can view own assignments CLERK" ON assignments
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

-- INSERT y UPDATE (sin DELETE para estudiantes)
CREATE POLICY "Users can insert own assignments CLERK" ON assignments
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Users can update own assignments CLERK" ON assignments
  FOR UPDATE
  USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user())
  WITH CHECK (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Admins and Mentors update assignments CLERK" ON assignments
  FOR UPDATE USING (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- QUIZ QUESTIONS
-- -------------------------------------------------------------------------
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users." ON quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions." ON quiz_questions;
DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users CLERK" ON quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions CLERK" ON quiz_questions;

CREATE POLICY "Approved users can view quiz questions" ON quiz_questions
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Admins can manage quiz questions CLERK" ON quiz_questions
  FOR ALL USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- QUIZ OPTIONS
-- -------------------------------------------------------------------------
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users." ON quiz_options;
DROP POLICY IF EXISTS "Admins can manage quiz options." ON quiz_options;
DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users CLERK" ON quiz_options;
DROP POLICY IF EXISTS "Admins can manage quiz options CLERK" ON quiz_options;

CREATE POLICY "Approved users can view quiz options" ON quiz_options
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Admins can manage quiz options CLERK" ON quiz_options
  FOR ALL USING (public.is_admin_clerk());

-- -------------------------------------------------------------------------
-- QUIZ ATTEMPTS
-- -------------------------------------------------------------------------
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts." ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts." ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all quiz attempts." ON quiz_attempts;
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can view own quiz attempts CLERK" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts CLERK" ON quiz_attempts;
DROP POLICY IF EXISTS "Admins can view all quiz attempts CLERK" ON quiz_attempts;

CREATE POLICY "Users can view own quiz attempts CLERK" ON quiz_attempts
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Users can insert own quiz attempts CLERK" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Admins and mentors can view all quiz attempts CLERK" ON quiz_attempts
  FOR SELECT USING (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- QUIZ ANSWERS
-- -------------------------------------------------------------------------
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz answers." ON quiz_answers;
DROP POLICY IF EXISTS "Users can insert own quiz answers." ON quiz_answers;
DROP POLICY IF EXISTS "Admins can view all quiz answers." ON quiz_answers;
DROP POLICY IF EXISTS "Users can view own quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Users can insert own quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Admins can view all quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Users can view own quiz answers CLERK" ON quiz_answers;
DROP POLICY IF EXISTS "Users can insert own quiz answers CLERK" ON quiz_answers;
DROP POLICY IF EXISTS "Admins can view all quiz answers CLERK" ON quiz_answers;

CREATE POLICY "Users can view own quiz answers CLERK" ON quiz_answers
  FOR SELECT USING (
    public.is_approved_user() AND
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Users can insert own quiz answers CLERK" ON quiz_answers
  FOR INSERT WITH CHECK (
    public.is_approved_user() AND
    EXISTS (SELECT 1 FROM quiz_attempts WHERE id = attempt_id AND user_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Admins and mentors can view all quiz answers CLERK" ON quiz_answers
  FOR SELECT USING (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- ATTENDANCE
-- -------------------------------------------------------------------------
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins and Mentors can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Users can view their own attendance CLERK" ON attendance;
DROP POLICY IF EXISTS "Admins and Mentors can manage attendance CLERK" ON attendance;

-- Estudiantes: solo pueden VER su propia asistencia (no insertar/modificar)
CREATE POLICY "Users can view their own attendance CLERK" ON attendance
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

-- Admins y mentors: gestión completa (marcar asistencia, editar, borrar)
CREATE POLICY "Admins and Mentors can manage attendance CLERK" ON attendance
  FOR ALL
  USING (public.is_admin_or_mentor_clerk())
  WITH CHECK (public.is_admin_or_mentor_clerk());

-- -------------------------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications CLERK" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications CLERK" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications CLERK" ON notifications;

CREATE POLICY "Users can view their own notifications CLERK" ON notifications
  FOR SELECT USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Users can update their own notifications CLERK" ON notifications
  FOR UPDATE USING (auth.jwt()->>'sub' = user_id AND public.is_approved_user());

CREATE POLICY "Admins can insert notifications CLERK" ON notifications
  FOR INSERT WITH CHECK (public.is_admin_or_mentor_clerk());

-- Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================================================================
-- PASO 6: STORAGE BUCKETS
-- =========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignments', 'assignments', true, 10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-resources', 'lesson-resources', true, 52428800,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'module-covers', 'module-covers', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- assignments permanece público para que getPublicUrl() funcione en el frontend
UPDATE storage.buckets SET public = true WHERE id = 'assignments';


-- =========================================================================
-- PASO 7: STORAGE RLS
-- =========================================================================

-- Estudiantes: solo pueden subir/actualizar en SU PROPIA carpeta ({user_id}/archivo)
DROP POLICY IF EXISTS "Students can upload assignments" ON storage.objects;
CREATE POLICY "Students can upload assignments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignments'
    AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students can view own assignments" ON storage.objects;
CREATE POLICY "Students can view own assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can update own assignments files" ON storage.objects;
DROP POLICY IF EXISTS "Students can update assignments" ON storage.objects;
CREATE POLICY "Students can update own assignments files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assignments'
    AND auth.jwt()->>'sub' = (storage.foldername(name))[1]
  );

-- Admins y mentors: pueden ver TODAS las tareas de todos los alumnos
DROP POLICY IF EXISTS "Admins and Mentors can view all assignments" ON storage.objects;
CREATE POLICY "Admins and Mentors can view all assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND public.is_admin_or_mentor_clerk());

-- Recursos de lecciones: solo admins gestionan, solo usuarios aprobados ven
DROP POLICY IF EXISTS "Admins can manage lesson resources storage" ON storage.objects;
CREATE POLICY "Admins can manage lesson resources storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lesson-resources' AND public.is_admin_clerk());

DROP POLICY IF EXISTS "Authenticated can view lesson resources" ON storage.objects;
CREATE POLICY "Authenticated can view lesson resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-resources' AND public.is_approved_user());

-- Portadas de módulos: solo admins gestionan, cualquiera puede ver
DROP POLICY IF EXISTS "Admins can manage module covers" ON storage.objects;
CREATE POLICY "Admins can manage module covers"
  ON storage.objects FOR ALL
  USING (bucket_id = 'module-covers' AND public.is_admin_clerk());

DROP POLICY IF EXISTS "Public can view module covers" ON storage.objects;
CREATE POLICY "Public can view module covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'module-covers');


-- =========================================================================
-- PASO 8: TRIGGER ANTI-ESCALADA DE PRIVILEGIOS
-- Impide que cualquier usuario modifique su propio role, status o eco_points
-- directamente desde el cliente, incluso con un JWT válido de Clerk.
-- Opera a nivel base de datos: no puede bypassearse via API REST de Supabase.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo admins pueden cambiar role, status y eco_points
  IF NOT public.is_admin_clerk() THEN
    NEW.role       := OLD.role;
    NEW.status     := OLD.status;
    NEW.eco_points := OLD.eco_points;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_no_privilege_escalation ON public.profiles;
CREATE TRIGGER enforce_no_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();
