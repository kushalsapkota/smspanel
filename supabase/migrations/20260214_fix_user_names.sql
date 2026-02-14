-- Fix Missing User Names in Profiles

-- Update existing profiles to use email as full_name if full_name is empty
-- This is a one-time fix for existing users
DO $$
DECLARE
    profile_record RECORD;
    user_email TEXT;
BEGIN
    FOR profile_record IN 
        SELECT user_id, full_name 
        FROM public.profiles 
        WHERE full_name IS NULL OR full_name = ''
    LOOP
        -- Get email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = profile_record.user_id;
        
        -- Update profile with email as fallback name
        IF user_email IS NOT NULL THEN
            UPDATE public.profiles
            SET full_name = user_email
            WHERE user_id = profile_record.user_id;
        END IF;
    END LOOP;
END $$;

-- Update the trigger function to ensure new users get proper names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use full_name from metadata, or email as fallback
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User'
    )
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
