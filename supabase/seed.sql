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
    'admin@festas.app',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ana Souza","role":"admin"}',
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
    '{"full_name":"Marina Alves","role":"organizer"}',
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
    '{"full_name":"Lucas Lima","role":"seller"}',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, avatar_label, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Ana Souza', 'AS', 'admin'),
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
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'reveillon-signature',
    'Reveillon Signature',
    'Casa Aurora',
    'Evento premium de virada.',
    '2025-12-31T23:30:00Z',
    52000,
    'past',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

insert into public.sellers (id, event_id, profile_id, ticket_quota, is_active)
values
  ('44444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 50, true),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 60, true),
  ('44444444-4444-4444-4444-444444444443', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 30, true),
  ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 80, true),
  ('44444444-4444-4444-4444-444444444445', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 90, true)
on conflict (id) do nothing;

insert into public.sales (event_id, seller_id, quantity, unit_price, payment_status, sold_at, notes, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444441', 20, 120, 'paid', '2026-04-01', 'Lote 2', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444442', 24, 120, 'pending', '2026-04-02', 'Equipe Lucas', '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444443', 8, 140, 'pending', '2026-04-03', 'Pre-sale', '33333333-3333-3333-3333-333333333333'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 67, 120, 'paid', '2025-12-29', 'Virada', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444445', 81, 120, 'paid', '2025-12-30', 'Lote final', '33333333-3333-3333-3333-333333333333');

insert into public.expenses (event_id, title, category, amount, incurred_at, notes, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DJ principal', 'Atracoes', 2800, '2026-03-28', 'Contrato assinado', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Open bar', 'Bebidas', 3650, '2026-03-30', 'Entrada inicial', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Locacao premium', 'Locacao', 12800, '2025-12-15', 'Pagamento integral', '11111111-1111-1111-1111-111111111111');

insert into public.tasks (event_id, title, owner_profile_id, status, due_at, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Confirmar lista VIP', '11111111-1111-1111-1111-111111111111', 'in-progress', '2026-04-05', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fechar fotografo', '22222222-2222-2222-2222-222222222222', 'pending', '2026-04-06', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Definir headline de campanha', '22222222-2222-2222-2222-222222222222', 'pending', '2026-04-12', '11111111-1111-1111-1111-111111111111');

insert into public.announcements (event_id, title, body, pinned, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Virada de lote sexta-feira', 'Todos os vendedores precisam reforcar o push no Instagram ate 18h.', true, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Abertura de lista embaixadores', 'Vamos ampliar a equipe comercial antes da virada do lote promocional.', true, '11111111-1111-1111-1111-111111111111');
