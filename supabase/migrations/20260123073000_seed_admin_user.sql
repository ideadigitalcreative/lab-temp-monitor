-- Enable pgcrypto extension for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Only insert if the user doesn't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@labtemp.com') THEN
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'superadmin@labtemp.com',
      crypt('Admin123!', gen_salt('bf')), -- Password: Admin123!
      now(), -- Auto confirm email
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- The trigger 'on_auth_user_created' defined in previous migration 
    -- should automatically create the profile with 'user' role.
    -- Now we upgrade it to 'admin'.
    
    -- Wait a moment for trigger (optional in SQL transaction but good concept)
    -- In single transaction, trigger fires immediately.
    
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = new_user_id;
    
  ELSE
    -- If user exists, just ensure they are admin
    UPDATE public.profiles
    SET role = 'admin'
    WHERE email = 'superadmin@labtemp.com';
  END IF;
END $$;
