insert into auth.users (
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
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'host@festas.app',
    crypt('Host123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ana Souza"}',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'organizador@festas.app',
    crypt('Organizador123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Marina Alves"}',
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'vendedor@festas.app',
    crypt('Vendedor123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Lucas Lima"}',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, avatar_label, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Ana Souza', 'AS', 'host'),
  ('22222222-2222-2222-2222-222222222222', 'Marina Alves', 'MA', 'organizer'),
  ('33333333-3333-3333-3333-333333333333', 'Lucas Lima', 'LL', 'seller')
on conflict (id) do update
set
  full_name = excluded.full_name,
  avatar_label = excluded.avatar_label,
  role = excluded.role;

insert into public.events (id, slug, name, venue, description, event_date, goal_value, status, created_by)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'sunset-white-party',
    'Sunset White Party',
    'Espaco Marina Sul',
    'Evento principal do semestre.',
    '2026-07-18T22:00:00Z',
    30000,
    'current',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'neon-jungle',
    'Neon Jungle',
    'Green Hall',
    'Proxima festa com foco em abertura de lote.',
    '2026-09-12T23:00:00Z',
    28000,
    'upcoming',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

insert into public.event_memberships (id, event_id, user_id, role, ticket_quota, is_active)
values
  ('44444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'host', 0, true),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'organizer', 0, true),
  ('44444444-4444-4444-4444-444444444443', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'seller', 60, true),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'host', 0, true),
  ('44444444-4444-4444-4444-444444444445', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'organizer', 0, true),
  ('44444444-4444-4444-4444-444444444446', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'seller', 30, true)
on conflict (id) do nothing;

insert into public.sales (event_id, seller_user_id, quantity, unit_price, payment_status, sold_at, notes, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 24, 120, 'pending', '2026-04-02', 'Equipe Lucas', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 12, 120, 'paid', '2026-04-03', 'Follow-up quente', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 8, 140, 'pending', '2026-04-03', 'Pre-sale', '33333333-3333-3333-3333-333333333333');
