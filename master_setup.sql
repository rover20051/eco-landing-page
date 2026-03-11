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

-- Add status column if this is an existing DB (idempotent)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
  -- Existing users (already in the system) should be approved
  UPDATE public.profiles SET status = 'approved' WHERE status IS NULL OR status = 'pending';
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


-- =========================================================================
-- PASO 4: CREACIÓN DE NUEVAS POLÍTICAS RLS Y REALTIME (CLERK)
-- =========================================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid infinite recursion on profiles table
CREATE OR REPLACE FUNCTION public.is_admin_clerk()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.jwt()->>'sub' AND role = 'admin'
  );
$$;

CREATE POLICY "Users can insert own profile via Clerk app" ON profiles FOR INSERT WITH CHECK (auth.jwt()->>'sub' = id);
CREATE POLICY "Users can view own profile CLERK" ON profiles FOR SELECT USING (auth.jwt()->>'sub' = id);
CREATE POLICY "Admins can view all profiles CLERK" ON profiles FOR SELECT USING (
  public.is_admin_clerk()
);
CREATE POLICY "Users can update own profile CLERK" ON profiles FOR UPDATE USING (auth.jwt()->>'sub' = id);

-- Modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Anyone can view active modules CLERK" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules CLERK" ON modules;
CREATE POLICY "Anyone can view active modules CLERK" ON modules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage modules CLERK" ON modules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin')
);

-- Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view lessons of active modules" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can view active lessons CLERK" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons CLERK" ON lessons;
CREATE POLICY "Anyone can view active lessons CLERK" ON lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM modules WHERE modules.id = lessons.module_id AND modules.is_active = true)
);
CREATE POLICY "Admins can manage lessons CLERK" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin')
);

-- Lesson Resources
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lesson resources are viewable by authenticated users." ON public.lesson_resources FOR SELECT USING ( auth.role() = 'authenticated' );
CREATE POLICY "Admins can manage lesson resources." ON public.lesson_resources FOR ALL USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin') );

-- User Progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress CLERK" ON user_progress FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can update own progress CLERK" ON user_progress FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- Lesson Progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own lesson progress CLERK" ON lesson_progress FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can update own lesson progress CLERK" ON lesson_progress FOR ALL USING (auth.jwt()->>'sub' = user_id);

-- Assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and mentors view all assignments CLERK" ON assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role IN ('admin', 'mentor'))
);
CREATE POLICY "Users can view own assignments CLERK" ON assignments FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can insert own assignments CLERK" ON assignments FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can update own assignments CLERK" ON assignments FOR UPDATE USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Admins and Mentors update assignments CLERK" ON assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role IN ('admin', 'mentor'))
);

-- Quiz Questions
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users." ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions." ON public.quiz_questions;
DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users CLERK" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions CLERK" ON public.quiz_questions;
CREATE POLICY "Quiz questions are viewable by authenticated users CLERK" ON public.quiz_questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage quiz questions CLERK" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin')
);

-- Quiz Options
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users." ON public.quiz_options;
DROP POLICY IF EXISTS "Admins can manage quiz options." ON public.quiz_options;
DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users CLERK" ON public.quiz_options;
DROP POLICY IF EXISTS "Admins can manage quiz options CLERK" ON public.quiz_options;
CREATE POLICY "Quiz options are viewable by authenticated users CLERK" ON public.quiz_options FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage quiz options CLERK" ON public.quiz_options FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin')
);

-- Quiz Attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quiz attempts CLERK" ON quiz_attempts FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can insert own quiz attempts CLERK" ON quiz_attempts FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Admins can view all quiz attempts CLERK" ON quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role IN ('mentor', 'admin'))
);

-- Quiz Answers
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quiz answers CLERK" ON public.quiz_answers FOR SELECT USING ( EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.jwt()->>'sub') );
CREATE POLICY "Users can insert own quiz answers CLERK" ON public.quiz_answers FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.jwt()->>'sub') );
CREATE POLICY "Admins can view all quiz answers CLERK" ON public.quiz_answers FOR SELECT USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.jwt()->>'sub' AND role IN ('mentor', 'admin')) );

-- Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attendance CLERK" ON public.attendance FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Admins and Mentors can manage attendance CLERK" ON public.attendance FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.jwt()->>'sub' AND role IN ('admin', 'mentor'))
);

-- Notifications
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications CLERK" ON public.notifications FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can update their own notifications CLERK" ON public.notifications FOR UPDATE USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Admins can insert notifications CLERK" ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.jwt()->>'sub' AND role IN ('admin', 'mentor'))
);

-- Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================================================================
-- PASO 5: STORAGE BUCKETS
-- =========================================================================
-- Bucket for student assignment uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignments', 'assignments', false, 10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket for lesson resource PDFs (admin uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-resources', 'lesson-resources', true, 52428800,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "Students can upload assignments" ON storage.objects;
CREATE POLICY "Students can upload assignments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignments' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can view own assignments" ON storage.objects;
CREATE POLICY "Students can view own assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.jwt()->>'sub' = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins and Mentors can view all assignments" ON storage.objects;
CREATE POLICY "Admins and Mentors can view all assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.jwt()->>'sub' AND role IN ('admin', 'mentor')
  ));

DROP POLICY IF EXISTS "Admins can manage lesson resources storage" ON storage.objects;
CREATE POLICY "Admins can manage lesson resources storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lesson-resources' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.jwt()->>'sub' AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Authenticated can view lesson resources" ON storage.objects;
CREATE POLICY "Authenticated can view lesson resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-resources' AND auth.role() = 'authenticated');


-- =========================================================================
-- PASO 6: SEED DATA (Módulos base ECO)
-- =========================================================================

INSERT INTO public.modules (id, title, description, module_number, cover_image, is_active, unlock_after_module_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'La Base del ECO: Escuchar', 'Descubre el poder del silencio y cómo la escucha activa puede transformar tu entorno inmediato.', 1, 'images/teens-worshipping.png', true, NULL),
  ('22222222-2222-2222-2222-222222222222', 'Conectar con Empatía', 'Aprende a ponerte en los zapatos de los demás para construir puentes de diálogo y entendimiento.', 2, 'images/teens-worshipping.png', true, '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'Organizar el Cambio', 'Convierte la empatía en acción colectiva organizando proyectos que resuelvan problemas reales.', 3, 'images/teens-worshipping.png', true, '22222222-2222-2222-2222-222222222222'),
  ('44444444-4444-4444-4444-444444444444', 'Liderazgo Resonante', 'El paso final: cómo mantener el ECO vibrando a través del tiempo en tu comunidad.', 4, 'images/teens-worshipping.png', true, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- Lessons Module 1
INSERT INTO public.lessons (id, module_id, title, lesson_number, youtube_video_id, content_text, estimated_minutes) VALUES
  ('a1111111-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Introducción: El poder de escuchar', 1, 'dQw4w9WgXcQ', 'En esta primera lección descubriremos por qué escuchar es el primer paso fundamental para cualquier líder joven. La escucha activa no es solo oír palabras, sino conectar con el corazón de las personas.', 15),
  ('a1111111-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Escuchar la voz de Dios', 2, 'dQw4w9WgXcQ', 'Aprenderemos a sintonizar con la voz de Dios en medio del ruido del mundo. Técnicas prácticas de meditación bíblica y oración contemplativa.', 20),
  ('a1111111-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Escuchar a tu comunidad', 3, 'dQw4w9WgXcQ', 'El líder que escucha a su comunidad es el que realmente puede transformarla. Herramientas para diagnosticar necesidades reales.', 18)
ON CONFLICT (id) DO NOTHING;

-- Lessons Module 2
INSERT INTO public.lessons (id, module_id, title, lesson_number, youtube_video_id, content_text, estimated_minutes) VALUES
  ('a2222222-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'Los fundamentos de la empatía cristiana', 1, 'dQw4w9WgXcQ', 'Jesús fue el mayor ejemplo de empatía. Exploraremos cómo su modelo nos enseña a conectar genuinamente con otros.', 22),
  ('a2222222-0001-0001-0001-000000000002', '22222222-2222-2222-2222-222222222222', 'Comunicación efectiva y asertiva', 2, 'dQw4w9WgXcQ', 'Aprende técnicas de comunicación que te permitirán expresar tus ideas con claridad mientras respetas las de los demás.', 18),
  ('a2222222-0001-0001-0001-000000000003', '22222222-2222-2222-2222-222222222222', 'Construyendo puentes, no muros', 3, 'dQw4w9WgXcQ', 'En un mundo polarizado, los líderes ECO construyen puentes de diálogo y entendimiento entre personas diferentes.', 16),
  ('a2222222-0001-0001-0001-000000000004', '22222222-2222-2222-2222-222222222222', 'Cómo el ECO transforma tus relaciones diarias', 4, 'dQw4w9WgXcQ', 'Aplicación práctica: cómo implementar todo lo aprendido en tu vida cotidiana para impactar tus relaciones.', 20)
ON CONFLICT (id) DO NOTHING;

-- Lessons Module 3
INSERT INTO public.lessons (id, module_id, title, lesson_number, youtube_video_id, content_text, estimated_minutes) VALUES
  ('a3333333-0001-0001-0001-000000000001', '33333333-3333-3333-3333-333333333333', 'De la empatía a la acción', 1, 'dQw4w9WgXcQ', 'El conocimiento sin acción es estéril. Aprende a convertir tu comprensión en proyectos concretos de impacto.', 20),
  ('a3333333-0001-0001-0001-000000000002', '33333333-3333-3333-3333-333333333333', 'Planificación de proyectos comunitarios', 2, 'dQw4w9WgXcQ', 'Herramientas prácticas para diseñar, planificar y ejecutar proyectos que transformen tu entorno.', 25),
  ('a3333333-0001-0001-0001-000000000003', '33333333-3333-3333-3333-333333333333', 'Trabajo en equipo y delegación', 3, 'dQw4w9WgXcQ', 'Un líder no hace todo solo. Aprende el arte de formar equipos y delegar responsabilidades efectivamente.', 18)
ON CONFLICT (id) DO NOTHING;

-- Lessons Module 4
INSERT INTO public.lessons (id, module_id, title, lesson_number, youtube_video_id, content_text, estimated_minutes) VALUES
  ('a4444444-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', 'El legado del líder', 1, 'dQw4w9WgXcQ', 'Todo líder deja una marca. Reflexiona sobre qué tipo de legado quieres construir y cómo empezar hoy.', 22),
  ('a4444444-0001-0001-0001-000000000002', '44444444-4444-4444-4444-444444444444', 'Multiplicar el ECO', 2, 'dQw4w9WgXcQ', 'El verdadero éxito no es lo que logras, sino lo que reproduces en otros. Estrategias de mentoría y discipulado.', 20),
  ('a4444444-0001-0001-0001-000000000003', '44444444-4444-4444-4444-444444444444', 'Tu misión personal', 3, 'dQw4w9WgXcQ', 'Sesión final: define tu misión personal y tu plan de acción para los próximos 6 meses como líder ECO.', 25)
ON CONFLICT (id) DO NOTHING;

-- Quiz Questions
INSERT INTO public.quiz_questions (id, lesson_id, question_text, question_order) VALUES
  ('b1111111-0001-0001-0001-000000000001', 'a1111111-0001-0001-0001-000000000001', '¿Cuál es el primer pilar del programa ECO?', 1),
  ('b1111111-0001-0001-0001-000000000002', 'a1111111-0001-0001-0001-000000000001', '¿Qué diferencia hay entre oír y escuchar activamente?', 2),
  ('b1111111-0001-0001-0001-000000000003', 'a1111111-0001-0001-0001-000000000001', '¿Por qué la escucha es fundamental para el liderazgo?', 3),
  ('b1111111-0002-0001-0001-000000000001', 'a1111111-0001-0001-0001-000000000002', '¿Cuál es una técnica para escuchar la voz de Dios?', 1),
  ('b1111111-0002-0001-0001-000000000002', 'a1111111-0001-0001-0001-000000000002', '¿Qué es la meditación bíblica?', 2),
  ('b2222222-0001-0001-0001-000000000001', 'a2222222-0001-0001-0001-000000000001', '¿Quién es el mayor ejemplo de empatía según la lección?', 1),
  ('b2222222-0001-0001-0001-000000000002', 'a2222222-0001-0001-0001-000000000001', '¿Qué significa empatía cristiana?', 2)
ON CONFLICT (id) DO NOTHING;

-- Limpiar opciones de examenes anteriores para evitar duplicados en seed recurrente
DELETE FROM public.quiz_options WHERE question_id IN (
  'b1111111-0001-0001-0001-000000000001',
  'b1111111-0001-0001-0001-000000000002',
  'b1111111-0001-0001-0001-000000000003',
  'b1111111-0002-0001-0001-000000000001',
  'b1111111-0002-0001-0001-000000000002',
  'b2222222-0001-0001-0001-000000000001',
  'b2222222-0001-0001-0001-000000000002'
);

INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0001-0001-0001-000000000001', 'Obedecer', false, 1),
  ('b1111111-0001-0001-0001-000000000001', 'Escuchar', true, 2),
  ('b1111111-0001-0001-0001-000000000001', 'Conocer', false, 3),
  ('b1111111-0001-0001-0001-000000000001', 'Liderar', false, 4),

  ('b1111111-0001-0001-0001-000000000002', 'No hay diferencia, son lo mismo', false, 1),
  ('b1111111-0001-0001-0001-000000000002', 'Escuchar activamente implica conectar con el corazón de la persona', true, 2),
  ('b1111111-0001-0001-0001-000000000002', 'Oír es más importante que escuchar', false, 3),
  ('b1111111-0001-0001-0001-000000000002', 'Escuchar es solo para líderes experimentados', false, 4),

  ('b1111111-0001-0001-0001-000000000003', 'Porque los líderes necesitan dar órdenes', false, 1),
  ('b1111111-0001-0001-0001-000000000003', 'Porque permite entender las necesidades reales de la comunidad', true, 2),
  ('b1111111-0001-0001-0001-000000000003', 'No es fundamental, es opcional', false, 3),
  ('b1111111-0001-0001-0001-000000000003', 'Solo es importante para líderes religiosos', false, 4),

  ('b1111111-0002-0001-0001-000000000001', 'Oración contemplativa y meditación bíblica', true, 1),
  ('b1111111-0002-0001-0001-000000000001', 'Escuchar música a alto volumen', false, 2),
  ('b1111111-0002-0001-0001-000000000001', 'Ignorar el silencio', false, 3),
  ('b1111111-0002-0001-0001-000000000001', 'Solo leer sin reflexionar', false, 4),

  ('b1111111-0002-0001-0001-000000000002', 'Leer la Biblia rápidamente', false, 1),
  ('b1111111-0002-0001-0001-000000000002', 'Reflexionar profundamente sobre un pasaje para escuchar a Dios', true, 2),
  ('b1111111-0002-0001-0001-000000000002', 'Memorizar versículos sin entenderlos', false, 3),
  ('b1111111-0002-0001-0001-000000000002', 'Solo escuchar sermones', false, 4),

  ('b2222222-0001-0001-0001-000000000001', 'Los apóstoles', false, 1),
  ('b2222222-0001-0001-0001-000000000001', 'Jesús', true, 2),
  ('b2222222-0001-0001-0001-000000000001', 'Moisés', false, 3),
  ('b2222222-0001-0001-0001-000000000001', 'David', false, 4),

  ('b2222222-0001-0001-0001-000000000002', 'Sentir lástima por otros', false, 1),
  ('b2222222-0001-0001-0001-000000000002', 'Conectar genuinamente con otros siguiendo el modelo de Jesús', true, 2),
  ('b2222222-0001-0001-0001-000000000002', 'Estar de acuerdo con todo', false, 3),
  ('b2222222-0001-0001-0001-000000000002', 'Evitar conflictos', false, 4);

-- =========================================================================
-- PASO 6: INICIALIZAR EL CRONOGRAMA DE ECO (Clases y Fechas de Apertura)
-- =========================================================================
DO $$
DECLARE
  v_mod1_id UUID;
  v_mod2_id UUID;
  v_mod3_id UUID;
  v_mod4_id UUID;
BEGIN
  -- ===============================
  -- MÓDULO 1: El Fundamento
  -- ===============================
  INSERT INTO public.modules (title, description, module_number, is_active)
  VALUES ('Módulo 1: El Fundamento', 'Bases bíblicas y culturales de ECO', 1, true)
  ON CONFLICT (module_number) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_mod1_id;

  INSERT INTO public.lessons (module_id, title, lesson_number, available_from)
  VALUES 
    (v_mod1_id, 'Creando una Cultura', 1, '2026-03-25'),
    (v_mod1_id, 'Mi Identidad', 2, '2026-04-08'),
    (v_mod1_id, 'El Evangelio y la Cruz', 3, '2026-04-22'),
    (v_mod1_id, 'Cómo leer la Biblia, como amar la Palabra', 4, '2026-05-06')
  ON CONFLICT (module_id, lesson_number) DO UPDATE 
  SET title = EXCLUDED.title, available_from = EXCLUDED.available_from;

  -- ===============================
  -- MÓDULO 2: La Vida Interior
  -- ===============================
  INSERT INTO public.modules (title, module_number, is_active)
  VALUES ('Módulo 2: La Vida Interior', 2, true)
  ON CONFLICT (module_number) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_mod2_id;

  INSERT INTO public.lessons (module_id, title, lesson_number, available_from)
  VALUES 
    (v_mod2_id, 'Sanidad emocional y espiritual', 1, '2026-05-20'),
    (v_mod2_id, 'El Ayuno y Oración', 2, '2026-06-03'),
    (v_mod2_id, 'La Adoración', 3, '2026-06-17'),
    (v_mod2_id, 'Una vida de hambre por Jesús', 4, '2026-07-01')
  ON CONFLICT (module_id, lesson_number) DO UPDATE 
  SET title = EXCLUDED.title, available_from = EXCLUDED.available_from;

  -- ===============================
  -- MÓDULO 3: La Vida Exterior
  -- ===============================
  INSERT INTO public.modules (title, module_number, is_active)
  VALUES ('Módulo 3: La Vida Exterior', 3, true)
  ON CONFLICT (module_number) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_mod3_id;

  INSERT INTO public.lessons (module_id, title, lesson_number, available_from)
  VALUES 
    (v_mod3_id, 'Santidad, pureza e integridad', 1, '2026-08-12'),
    (v_mod3_id, 'Carácter de un cristiano', 2, '2026-08-26'),
    (v_mod3_id, 'Relaciones sanas', 3, '2026-09-09'),
    (v_mod3_id, 'La iglesia como comunidad', 4, '2026-09-23')
  ON CONFLICT (module_id, lesson_number) DO UPDATE 
  SET title = EXCLUDED.title, available_from = EXCLUDED.available_from;

  -- ===============================
  -- MÓDULO 4: La Misión
  -- ===============================
  INSERT INTO public.modules (title, module_number, is_active)
  VALUES ('Módulo 4: La Misión', 4, true)
  ON CONFLICT (module_number) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_mod4_id;

  INSERT INTO public.lessons (module_id, title, lesson_number, available_from)
  VALUES 
    (v_mod4_id, 'El corazón de un siervo', 1, '2026-10-07'),
    (v_mod4_id, 'Sobrenaturalidad y poder', 2, '2026-10-21'),
    (v_mod4_id, 'Herramientas para liderar', 3, '2026-11-04'),
    (v_mod4_id, 'Propósito, llamado y misión', 4, '2026-11-18'),
    (v_mod4_id, 'Cierre del Año - Encuentro de Cierre / Celebración / Invitado', 5, '2026-12-02')
  ON CONFLICT (module_id, lesson_number) DO UPDATE 
  SET title = EXCLUDED.title, available_from = EXCLUDED.available_from;

END $$;
/*
👉 FEDE: COPIA ESTE CÓDIGO Y EJECUTALO EN EL "SQL EDITOR" DE SUPABASE
Esto corrige un error masivo de Recursividad (Infinite Recursion) que estaba bloqueando de raíz 
al "Administrador" para ver perfiles de alumnos, editar lecciones, ver entregas y registrar notificaciones.
*/

-- 1. Helper function for Admin (Security definer omite bloqueos paralelos)
CREATE OR REPLACE FUNCTION public.is_admin_clerk()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = coalesce(auth.jwt()->>'sub', '') AND role = 'admin'::user_role
  ) INTO _is_admin;
  RETURN coalesce(_is_admin, false);
END;
$$;

-- 2. Helper function for Admin or Mentor
CREATE OR REPLACE FUNCTION public.is_admin_or_mentor_clerk()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_access boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = coalesce(auth.jwt()->>'sub', '') AND role IN ('admin'::user_role, 'mentor'::user_role)
  ) INTO _has_access;
  RETURN coalesce(_has_access, false);
END;
$$;

-- 3. Actualizar políticas que usan Admin

DROP POLICY IF EXISTS "Admins can view all profiles CLERK" ON public.profiles;
CREATE POLICY "Admins can view all profiles CLERK" ON public.profiles FOR SELECT USING ( public.is_admin_clerk() );

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Admins can manage lessons CLERK" ON public.lessons;
CREATE POLICY "Admins can manage lessons CLERK" ON public.lessons FOR ALL USING ( public.is_admin_clerk() );

DROP POLICY IF EXISTS "Admins can manage modules CLERK" ON public.modules;
CREATE POLICY "Admins can manage modules CLERK" ON public.modules FOR ALL USING ( public.is_admin_clerk() );

DROP POLICY IF EXISTS "Admins can manage quiz questions CLERK" ON public.quiz_questions;
CREATE POLICY "Admins can manage quiz questions CLERK" ON public.quiz_questions FOR ALL USING ( public.is_admin_clerk() );

DROP POLICY IF EXISTS "Admins can manage quiz options CLERK" ON public.quiz_options;
CREATE POLICY "Admins can manage quiz options CLERK" ON public.quiz_options FOR ALL USING ( public.is_admin_clerk() );

DROP POLICY IF EXISTS "Admins can manage lesson resources." ON public.lesson_resources;
CREATE POLICY "Admins can manage lesson resources." ON public.lesson_resources FOR ALL USING ( public.is_admin_clerk() );

-- 4. Actualizar políticas que usan Admin + Mentor

DROP POLICY IF EXISTS "Admins and mentors view all assignments CLERK" ON public.assignments;
CREATE POLICY "Admins and mentors view all assignments CLERK" ON public.assignments FOR SELECT USING ( public.is_admin_or_mentor_clerk() );

DROP POLICY IF EXISTS "Admins and Mentors update assignments CLERK" ON public.assignments;
CREATE POLICY "Admins and Mentors update assignments CLERK" ON public.assignments FOR UPDATE USING ( public.is_admin_or_mentor_clerk() );

DROP POLICY IF EXISTS "Admins can view all quiz attempts CLERK" ON public.quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts CLERK" ON public.quiz_attempts FOR SELECT USING ( public.is_admin_or_mentor_clerk() );

DROP POLICY IF EXISTS "Admins can view all quiz answers CLERK" ON public.quiz_answers;
CREATE POLICY "Admins can view all quiz answers CLERK" ON public.quiz_answers FOR SELECT USING ( public.is_admin_or_mentor_clerk() );

DROP POLICY IF EXISTS "Admins and Mentors can manage attendance CLERK" ON public.attendance;
CREATE POLICY "Admins and Mentors can manage attendance CLERK" ON public.attendance FOR ALL USING ( public.is_admin_or_mentor_clerk() );

DROP POLICY IF EXISTS "Admins can insert notifications CLERK" ON public.notifications;
CREATE POLICY "Admins can insert notifications CLERK" ON public.notifications FOR INSERT WITH CHECK ( public.is_admin_or_mentor_clerk() );

-- Opcional: Actualizar el Storage Bucket
DROP POLICY IF EXISTS "Admins and Mentors can view all assignments" ON storage.objects;
CREATE POLICY "Admins and Mentors can view all assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND public.is_admin_or_mentor_clerk());

DROP POLICY IF EXISTS "Admins can manage lesson resources storage" ON storage.objects;
CREATE POLICY "Admins can manage lesson resources storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lesson-resources' AND public.is_admin_clerk());
