-- Add full_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing profiles to have empty string or null (optional, usually null is fine)
-- If we want to populate it with something based on email:
-- UPDATE public.profiles SET full_name = split_part(email, '@', 1) WHERE full_name IS NULL;
