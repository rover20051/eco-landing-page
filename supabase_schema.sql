-- ==========================================
-- ECO E-Learning Database Schema
-- ==========================================

-- 1. Create custom enum types for progress
CREATE TYPE user_role AS ENUM ('student', 'mentor', 'admin');
CREATE TYPE module_status AS ENUM ('locked', 'in_progress', 'completed');
CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'graded');

-- 2. Profiles Table (Extends Supabase Auth Auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'student'::user_role,
    eco_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Modules Table (List of available courses)
CREATE TABLE public.modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    module_number INTEGER NOT NULL UNIQUE,
    cover_image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Lessons Table (Videos/Content inside Modules)
CREATE TABLE public.lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_number INTEGER NOT NULL,
    video_url TEXT,
    content_text TEXT,
    estimated_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(module_id, lesson_number)
);

-- 5. User Progress (Tracks where the user is)
CREATE TABLE public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    status module_status DEFAULT 'locked'::module_status,
    progress_percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, module_id)
);

-- Enable RLS for progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies for progress
CREATE POLICY "Users can view own progress."
  ON public.user_progress FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can update own progress."
  ON public.user_progress FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own progress."
  ON public.user_progress FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- 6. Assignments (Tareas)
CREATE TABLE public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_text TEXT,
    file_url TEXT,
    status assignment_status DEFAULT 'submitted'::assignment_status,
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Policies for assignments
CREATE POLICY "Users can view own assignments."
  ON public.assignments FOR SELECT
  USING ( auth.uid() = user_id );
  
CREATE POLICY "Users can insert own assignments."
  ON public.assignments FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Mentors can view all assignments."
  ON public.assignments FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

CREATE POLICY "Mentors can grade assignments."
  ON public.assignments FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- Set up Realtime for progress and assignments
alter publication supabase_realtime add table public.user_progress;
alter publication supabase_realtime add table public.assignments;
