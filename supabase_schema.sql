-- ==========================================
-- ECO E-Learning Database Schema (Idempotent)
-- Safe to run multiple times
-- ==========================================

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

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'student'::user_role,
    eco_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if they don't exist yet (for existing tables)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eco_points INTEGER DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date DATE;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile."
  ON public.profiles FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Modules Table
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

DO $$ BEGIN
  ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS unlock_after_module_id UUID REFERENCES public.modules(id);
END $$;

-- 4. Lessons Table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(module_id, lesson_number)
);

DO $$ BEGIN
  ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
  ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_guide_url TEXT;
  ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS task_description TEXT;
END $$;

-- 5. Lesson Resources
CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    resource_type TEXT DEFAULT 'pdf',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lesson resources are viewable by authenticated users." ON public.lesson_resources;
CREATE POLICY "Lesson resources are viewable by authenticated users."
  ON public.lesson_resources FOR SELECT
  USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admins can manage lesson resources." ON public.lesson_resources;
CREATE POLICY "Admins can manage lesson resources."
  ON public.lesson_resources FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- 6. User Progress (Module level)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    status module_status DEFAULT 'locked'::module_status,
    progress_percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, module_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress." ON public.user_progress;
CREATE POLICY "Users can view own progress."
  ON public.user_progress FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own progress." ON public.user_progress;
CREATE POLICY "Users can update own progress."
  ON public.user_progress FOR UPDATE USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own progress." ON public.user_progress;
CREATE POLICY "Users can insert own progress."
  ON public.user_progress FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Admins can view all progress." ON public.user_progress;
CREATE POLICY "Admins can view all progress."
  ON public.user_progress FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- 7. Lesson Progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    video_completed BOOLEAN DEFAULT false,
    quiz_completed BOOLEAN DEFAULT false,
    assignment_submitted BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can view own lesson progress."
  ON public.lesson_progress FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can insert own lesson progress."
  ON public.lesson_progress FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can update own lesson progress."
  ON public.lesson_progress FOR UPDATE USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Admins can view all lesson progress." ON public.lesson_progress;
CREATE POLICY "Admins can view all lesson progress."
  ON public.lesson_progress FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- 8. Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_text TEXT,
    file_url TEXT,
    status assignment_status DEFAULT 'submitted'::assignment_status,
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE
);

DO $$ BEGIN
  ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;
END $$;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignments." ON public.assignments;
CREATE POLICY "Users can view own assignments."
  ON public.assignments FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own assignments." ON public.assignments;
CREATE POLICY "Users can insert own assignments."
  ON public.assignments FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Mentors can view all assignments." ON public.assignments;
CREATE POLICY "Mentors can view all assignments."
  ON public.assignments FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

DROP POLICY IF EXISTS "Mentors can grade assignments." ON public.assignments;
CREATE POLICY "Mentors can grade assignments."
  ON public.assignments FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- 9. Quiz Questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users." ON public.quiz_questions;
CREATE POLICY "Quiz questions are viewable by authenticated users."
  ON public.quiz_questions FOR SELECT
  USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admins can manage quiz questions." ON public.quiz_questions;
CREATE POLICY "Admins can manage quiz questions."
  ON public.quiz_questions FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- 10. Quiz Options
CREATE TABLE IF NOT EXISTS public.quiz_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    option_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz options are viewable by authenticated users." ON public.quiz_options;
CREATE POLICY "Quiz options are viewable by authenticated users."
  ON public.quiz_options FOR SELECT
  USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admins can manage quiz options." ON public.quiz_options;
CREATE POLICY "Admins can manage quiz options."
  ON public.quiz_options FOR ALL
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- 11. Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts."
  ON public.quiz_attempts FOR SELECT USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts."
  ON public.quiz_attempts FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Admins can view all quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts."
  ON public.quiz_attempts FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- 12. Quiz Answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.quiz_options(id),
    is_correct BOOLEAN DEFAULT false
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz answers." ON public.quiz_answers;
CREATE POLICY "Users can view own quiz answers."
  ON public.quiz_answers FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()) );

DROP POLICY IF EXISTS "Users can insert own quiz answers." ON public.quiz_answers;
CREATE POLICY "Users can insert own quiz answers."
  ON public.quiz_answers FOR INSERT
  WITH CHECK ( EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()) );

DROP POLICY IF EXISTS "Admins can view all quiz answers." ON public.quiz_answers;
CREATE POLICY "Admins can view all quiz answers."
  ON public.quiz_answers FOR SELECT
  USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')) );

-- Realtime (safe to run multiple times - ignores if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- SEED DATA (uses ON CONFLICT to be idempotent)
-- ==========================================

-- Module 1-4
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

-- Quiz Questions (UUIDs must be valid hex - no letters beyond a-f)
INSERT INTO public.quiz_questions (id, lesson_id, question_text, question_order) VALUES
  ('b1111111-0001-0001-0001-000000000001', 'a1111111-0001-0001-0001-000000000001', '¿Cuál es el primer pilar del programa ECO?', 1),
  ('b1111111-0001-0001-0001-000000000002', 'a1111111-0001-0001-0001-000000000001', '¿Qué diferencia hay entre oír y escuchar activamente?', 2),
  ('b1111111-0001-0001-0001-000000000003', 'a1111111-0001-0001-0001-000000000001', '¿Por qué la escucha es fundamental para el liderazgo?', 3),
  ('b1111111-0002-0001-0001-000000000001', 'a1111111-0001-0001-0001-000000000002', '¿Cuál es una técnica para escuchar la voz de Dios?', 1),
  ('b1111111-0002-0001-0001-000000000002', 'a1111111-0001-0001-0001-000000000002', '¿Qué es la meditación bíblica?', 2),
  ('b2222222-0001-0001-0001-000000000001', 'a2222222-0001-0001-0001-000000000001', '¿Quién es el mayor ejemplo de empatía según la lección?', 1),
  ('b2222222-0001-0001-0001-000000000002', 'a2222222-0001-0001-0001-000000000001', '¿Qué significa empatía cristiana?', 2)
ON CONFLICT (id) DO NOTHING;

-- Quiz Options (delete in correct order to avoid FK violations)
-- 1. Delete answers that reference these options
DELETE FROM public.quiz_answers
WHERE selected_option_id IN (
  SELECT id FROM public.quiz_options WHERE question_id IN (
    'b1111111-0001-0001-0001-000000000001',
    'b1111111-0001-0001-0001-000000000002',
    'b1111111-0001-0001-0001-000000000003',
    'b1111111-0002-0001-0001-000000000001',
    'b1111111-0002-0001-0001-000000000002',
    'b2222222-0001-0001-0001-000000000001',
    'b2222222-0001-0001-0001-000000000002'
  )
);
-- 2. Now safe to delete options
DELETE FROM public.quiz_options WHERE question_id IN (
  'b1111111-0001-0001-0001-000000000001',
  'b1111111-0001-0001-0001-000000000002',
  'b1111111-0001-0001-0001-000000000003',
  'b1111111-0002-0001-0001-000000000001',
  'b1111111-0002-0001-0001-000000000002',
  'b2222222-0001-0001-0001-000000000001',
  'b2222222-0001-0001-0001-000000000002'
);

-- Options for Q1 Lesson 1
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0001-0001-0001-000000000001', 'Obedecer', false, 1),
  ('b1111111-0001-0001-0001-000000000001', 'Escuchar', true, 2),
  ('b1111111-0001-0001-0001-000000000001', 'Conocer', false, 3),
  ('b1111111-0001-0001-0001-000000000001', 'Liderar', false, 4);

-- Options for Q2 Lesson 1
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0001-0001-0001-000000000002', 'No hay diferencia, son lo mismo', false, 1),
  ('b1111111-0001-0001-0001-000000000002', 'Escuchar activamente implica conectar con el corazón de la persona', true, 2),
  ('b1111111-0001-0001-0001-000000000002', 'Oír es más importante que escuchar', false, 3),
  ('b1111111-0001-0001-0001-000000000002', 'Escuchar es solo para líderes experimentados', false, 4);

-- Options for Q3 Lesson 1
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0001-0001-0001-000000000003', 'Porque los líderes necesitan dar órdenes', false, 1),
  ('b1111111-0001-0001-0001-000000000003', 'Porque permite entender las necesidades reales de la comunidad', true, 2),
  ('b1111111-0001-0001-0001-000000000003', 'No es fundamental, es opcional', false, 3),
  ('b1111111-0001-0001-0001-000000000003', 'Solo es importante para líderes religiosos', false, 4);

-- Options for Q1 Lesson 2
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0002-0001-0001-000000000001', 'Oración contemplativa y meditación bíblica', true, 1),
  ('b1111111-0002-0001-0001-000000000001', 'Escuchar música a alto volumen', false, 2),
  ('b1111111-0002-0001-0001-000000000001', 'Ignorar el silencio', false, 3),
  ('b1111111-0002-0001-0001-000000000001', 'Solo leer sin reflexionar', false, 4);

-- Options for Q2 Lesson 2
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b1111111-0002-0001-0001-000000000002', 'Leer la Biblia rápidamente', false, 1),
  ('b1111111-0002-0001-0001-000000000002', 'Reflexionar profundamente sobre un pasaje para escuchar a Dios', true, 2),
  ('b1111111-0002-0001-0001-000000000002', 'Memorizar versículos sin entenderlos', false, 3),
  ('b1111111-0002-0001-0001-000000000002', 'Solo escuchar sermones', false, 4);

-- Options for Q1 Module 2
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b2222222-0001-0001-0001-000000000001', 'Los apóstoles', false, 1),
  ('b2222222-0001-0001-0001-000000000001', 'Jesús', true, 2),
  ('b2222222-0001-0001-0001-000000000001', 'Moisés', false, 3),
  ('b2222222-0001-0001-0001-000000000001', 'David', false, 4);

-- Options for Q2 Module 2
INSERT INTO public.quiz_options (question_id, option_text, is_correct, option_order) VALUES
  ('b2222222-0001-0001-0001-000000000002', 'Sentir lástima por otros', false, 1),
  ('b2222222-0001-0001-0001-000000000002', 'Conectar genuinamente con otros siguiendo el modelo de Jesús', true, 2),
  ('b2222222-0001-0001-0001-000000000002', 'Estar de acuerdo con todo', false, 3),
  ('b2222222-0001-0001-0001-000000000002', 'Evitar conflictos', false, 4);

-- ==========================================
-- STORAGE BUCKETS
-- NOTE: Run this AFTER the main schema above.
-- Create buckets from Supabase Dashboard > Storage > New bucket,
-- OR run via SQL:
-- ==========================================

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

-- Storage RLS policies (DROP first to be idempotent)
DROP POLICY IF EXISTS "Students can upload assignments" ON storage.objects;
CREATE POLICY "Students can upload assignments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can view own assignments" ON storage.objects;
CREATE POLICY "Students can view own assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins and Mentors can view all assignments" ON storage.objects;
CREATE POLICY "Admins and Mentors can view all assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'mentor')
  ));

DROP POLICY IF EXISTS "Admins can manage lesson resources storage" ON storage.objects;
CREATE POLICY "Admins can manage lesson resources storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'lesson-resources' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Authenticated can view lesson resources" ON storage.objects;
CREATE POLICY "Authenticated can view lesson resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-resources' AND auth.role() = 'authenticated');
