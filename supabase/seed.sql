-- Seed file for local development

-- Create a demo user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'authenticated',
    'authenticated',
    'demo@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Demo User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insert into public.users
INSERT INTO public.users (
    id,
    email,
    name,
    email_verified,
    password_hash,
    image,
    created_at,
    updated_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@ui-syncup.com',
    'Demo User',
    true,
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Demo',
    NOW(),
    NOW()
) ON CONFLICT ON CONSTRAINT users_email_unique DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email_verified = EXCLUDED.email_verified;

-- Create a demo team
INSERT INTO public.teams (
    id,
    name,
    slug,
    plan_id,
    billable_seats,
    created_at,
    updated_at
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Demo Team',
    'demo-team',
    'free',
    0,
    NOW(),
    NOW()
) ON CONFLICT ON CONSTRAINT teams_slug_unique DO NOTHING;

-- Add user to team
INSERT INTO public.team_members (
    team_id,
    user_id,
    management_role,
    operational_role,
    joined_at
) VALUES (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'TEAM_OWNER',
    'TEAM_EDITOR',
    NOW()
) ON CONFLICT (team_id, user_id) DO UPDATE SET
    management_role = EXCLUDED.management_role,
    operational_role = EXCLUDED.operational_role;

-- Set last active team for user
UPDATE public.users
SET last_active_team_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
