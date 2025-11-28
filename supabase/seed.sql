-- Seed file for local Supabase development
-- Mirrors the data provisioned by scripts/seed.ts so both entry points stay in sync.

-- ============================================================================
-- 1. Auth Users (Supabase auth schema)
-- ============================================================================

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
) VALUES
  (
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'authenticated',
    'authenticated',
    'alice@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alice Smith"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'authenticated',
    'authenticated',
    'bob@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Bob Jones"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    'authenticated',
    'authenticated',
    'charlie@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Charlie Brown"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'authenticated',
    'authenticated',
    'diana@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Diana Prince"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    'authenticated',
    'authenticated',
    'eve@ui-syncup.com',
    '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Eve Turner"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  last_sign_in_at = EXCLUDED.last_sign_in_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 2-7. Application schema seed (guarded so `supabase db reset` succeeds
--      even if Drizzle migrations haven't been applied yet)
-- ============================================================================

DO $seed$
DECLARE
  required_tables int;
BEGIN
  SELECT COUNT(*)
  INTO required_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'users',
      'teams',
      'team_members',
      'projects',
      'user_roles',
      'team_invitations'
    );

  IF required_tables < 6 THEN
    RAISE NOTICE 'Skipping application seed data because public schema tables are missing. Run `bun run db:migrate` + `bun run db:seed` after reset.';
    RETURN;
  END IF;

  -- Application Users
  INSERT INTO public.users (
    id,
    email,
    name,
    email_verified,
    password_hash,
    image,
    last_active_team_id,
    created_at,
    updated_at
  ) VALUES
    (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'demo@ui-syncup.com',
      'Demo User',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Demo',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      NOW(),
      NOW()
    ),
    (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      'alice@ui-syncup.com',
      'Alice Smith',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Alice',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      NOW(),
      NOW()
    ),
    (
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      'bob@ui-syncup.com',
      'Bob Jones',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Bob',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      NOW(),
      NOW()
    ),
    (
      'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
      'charlie@ui-syncup.com',
      'Charlie Brown',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Charlie',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      NOW(),
      NOW()
    ),
    (
      'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      'diana@ui-syncup.com',
      'Diana Prince',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Diana',
      'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
      NOW(),
      NOW()
    ),
    (
      'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      'eve@ui-syncup.com',
      'Eve Turner',
      TRUE,
      '$argon2id$v=19$m=65536,t=3,p=1$pwE4koMAmkcE/DsAVUGBiQ$8MgxpUDRxW8sJOENdqYpgznK433MMC8OORSRc/LQ5kE',
      'https://api.dicebear.com/9.x/avataaars/svg?seed=Eve',
      'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24',
      NOW(),
      NOW()
    )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    image = EXCLUDED.image,
    password_hash = EXCLUDED.password_hash,
    email_verified = EXCLUDED.email_verified,
    last_active_team_id = EXCLUDED.last_active_team_id,
    updated_at = NOW();

  -- Teams
  INSERT INTO public.teams (
    id,
    name,
    slug,
    plan_id,
    billable_seats,
    description,
    image,
    created_at,
    updated_at
  ) VALUES
    (
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'Demo Team',
      'demo-team',
      'free',
      2,
      'Baseline workspace used throughout docs and onboarding flows.',
      NULL,
      NOW(),
      NOW()
    ),
    (
      'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
      'Product Design',
      'product-design',
      'pro',
      2,
      'Pro plan workspace that exercises billing + admin features.',
      NULL,
      NOW(),
      NOW()
    ),
    (
      'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24',
      'QA Guild',
      'qa-guild',
      'free',
      1,
      'Secondary workspace for testing team switching and exports.',
      NULL,
      NOW(),
      NOW()
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    plan_id = EXCLUDED.plan_id,
    billable_seats = EXCLUDED.billable_seats,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    updated_at = NOW();

  -- Team Members
  INSERT INTO public.team_members (
    team_id,
    user_id,
    management_role,
    operational_role,
    invited_by,
    joined_at
  ) VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_OWNER', 'TEAM_EDITOR', NULL, NOW()),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_ADMIN', 'TEAM_EDITOR', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NULL, 'TEAM_MEMBER', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NULL, 'TEAM_VIEWER', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_OWNER', 'TEAM_EDITOR', NULL, NOW()),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_ADMIN', 'TEAM_EDITOR', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NULL, 'TEAM_MEMBER', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'TEAM_OWNER', 'TEAM_MEMBER', NULL, NOW()),
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'TEAM_ADMIN', 'TEAM_EDITOR', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NOW())
  ON CONFLICT (team_id, user_id) DO UPDATE SET
    management_role = EXCLUDED.management_role,
    operational_role = EXCLUDED.operational_role,
    invited_by = EXCLUDED.invited_by,
    joined_at = EXCLUDED.joined_at;

  -- Projects
  INSERT INTO public.projects (
    id,
    name,
    description,
    owner_id,
    is_active,
    created_at,
    updated_at
  ) VALUES
    (
      '11111111-2222-3333-4444-555555555555',
      'Design System Refresh',
      'Component audit that keeps Alice as the blocking owner.',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      TRUE,
      NOW(),
      NOW()
    ),
    (
      '22222222-3333-4444-5555-666666666666',
      'Release Regression Suite',
      'Regression checklist Bob owns, blocks demotion/removal tests.',
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      TRUE,
      NOW(),
      NOW()
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    owner_id = EXCLUDED.owner_id,
    updated_at = NOW();

  -- User Roles
  DELETE FROM public.user_roles
  WHERE (resource_type = 'team' AND resource_id IN (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'
  )) OR (resource_type = 'project' AND resource_id IN (
    '11111111-2222-3333-4444-555555555555',
    '22222222-3333-4444-5555-666666666666'
  ));

  INSERT INTO public.user_roles (
    id,
    user_id,
    role,
    resource_type,
    resource_id,
    created_at
  ) VALUES
    (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_OWNER', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_EDITOR', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_ADMIN', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_EDITOR', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'TEAM_MEMBER', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'TEAM_VIEWER', 'team', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW()),
    (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_OWNER', 'team', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW()),
    (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'TEAM_EDITOR', 'team', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW()),
    (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_ADMIN', 'team', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW()),
    (gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TEAM_EDITOR', 'team', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW()),
    (gen_random_uuid(), 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'TEAM_MEMBER', 'team', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW()),
    (gen_random_uuid(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'TEAM_OWNER', 'team', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', NOW()),
    (gen_random_uuid(), 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'TEAM_MEMBER', 'team', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', NOW()),
    (gen_random_uuid(), 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'TEAM_ADMIN', 'team', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', NOW()),
    (gen_random_uuid(), 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'TEAM_EDITOR', 'team', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', NOW()),
    (gen_random_uuid(), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'PROJECT_OWNER', 'project', '11111111-2222-3333-4444-555555555555', NOW()),
    (gen_random_uuid(), 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'PROJECT_OWNER', 'project', '22222222-3333-4444-5555-666666666666', NOW());

  -- Invitations
  INSERT INTO public.team_invitations (
    team_id,
    email,
    token_hash,
    management_role,
    operational_role,
    invited_by,
    expires_at,
    used_at,
    cancelled_at,
    created_at
  ) VALUES
    (
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'pm.contractor@ui-syncup.com',
      '022fe8316a9ab3caa62ed1b8789eabfe5ed0a002305af1169e4a72c6e24ba8a7',
      'TEAM_ADMIN',
      'TEAM_EDITOR',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      NOW() + INTERVAL '7 days',
      NULL,
      NULL,
      NOW()
    ),
    (
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'designer.contract@ui-syncup.com',
      '1481aab4a233ad659ab1626e32b4080ec61fddabb46cf48f1177c9dad57cbec9',
      NULL,
      'TEAM_MEMBER',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      NOW() + INTERVAL '5 days',
      NOW() - INTERVAL '2 days',
      NULL,
      NOW()
    ),
    (
      'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
      'qa.lead@ui-syncup.com',
      '29131f4b3ba57e33bb31e19b67ea2c6bbfeee80cadcea6f0c778accc295bf007',
      NULL,
      'TEAM_VIEWER',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      NOW() - INTERVAL '3 days',
      NULL,
      NULL,
      NOW()
    ),
    (
      'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24',
      'ops.manager@ui-syncup.com',
      '183a71e46f479d626be955c605f4a48289f189a85aad591af8092f25f0ef9b5b',
      'TEAM_ADMIN',
      'TEAM_MEMBER',
      'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      NOW() + INTERVAL '7 days',
      NULL,
      NOW() - INTERVAL '1 day',
      NOW()
    )
  ON CONFLICT (token_hash) DO UPDATE SET
    management_role = EXCLUDED.management_role,
    operational_role = EXCLUDED.operational_role,
    invited_by = EXCLUDED.invited_by,
    expires_at = EXCLUDED.expires_at,
    used_at = EXCLUDED.used_at,
    cancelled_at = EXCLUDED.cancelled_at,
    created_at = EXCLUDED.created_at;
END
$seed$;
