-- ============================================================
-- Migration: Create profiles table for bailiff team members
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)
-- ============================================================

-- 1. Create the profiles table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('officer', 'assistant', 'accountant')),
  office_name TEXT NOT NULL DEFAULT 'مكتب المفوض القضائي بالرباط',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow users to read all profiles (for team listing)
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 4. Only officers can update profiles
CREATE POLICY "Officers can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'officer'
    )
  );

-- 5. Auto-create profile on user signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, office_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'assistant'),
    COALESCE(NEW.raw_user_meta_data->>'office_name', 'مكتب المفوض القضائي بالرباط')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- IMPORTANT: Create the 3 team users in Supabase Auth
-- Go to: Authentication > Users > Add User
-- Or run the SQL below (requires pgcrypto):
-- ============================================================

-- Uncomment and run ONE TIME if you want to create users via SQL:
/*
-- Insert users into auth.users (requires service_role)
-- Or use the Supabase Dashboard > Authentication > Add User

-- For Dashboard manual creation:
-- 1. Go to Authentication > Users
-- 2. Click "Add User"
-- 3. Create each user:

-- User 1: elkhalifi@bailiff.ma / admin2026
--   metadata: {"username":"elkhalifi","full_name":"الأستاذ المصطفى الخليفي","role":"officer","office_name":"مكتب المفوض القضائي بالرباط - الدائرة القضائية وبني ملال"}

-- User 2: yassir@bailiff.ma / admin2026
--   metadata: {"username":"yassir_assistant","full_name":"ياسير الداودي (مساعد محلف)","role":"assistant","office_name":"مكتب المفوض القضائي بالرباط"}

-- User 3: rachida@bailiff.ma / admin2026
--   metadata: {"username":"rachida_acc","full_name":"رشيدة علمي (محاسبة المكتب)","role":"accountant","office_name":"مكتب المفوض القضائي بالرباط"}
*/
