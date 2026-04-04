# Festas Dashboard

Plataforma de gestao de festas com Next.js + Supabase, autenticacao fechada e permissoes por cargo global e por festa.

## Estrategia atual de usuarios

- nao existe cadastro publico pela interface
- voce cria os usuarios manualmente no Supabase Auth
- cada usuario ganha um cargo global em `profiles`
- cada usuario tambem pode receber um cargo por festa em `event_memberships`

## Papeis

- `host`: controla tudo
- `organizer`: gerencia a operacao da festa em que esta vinculado
- `seller`: registra e edita apenas as proprias vendas na festa em que esta vinculado

## Estrutura principal

- `profiles`: perfil do usuario autenticado com cargo global
- `event_memberships`: vinculo do usuario com uma festa especifica
- `sales`: vendas ligadas diretamente ao `seller_user_id`

## SQL

- estrutura e RLS: `supabase/schema.sql`
- dados iniciais de teste: `supabase/seed.sql`

## Como configurar

1. Crie um projeto no Supabase.
2. Rode `supabase/schema.sql` no SQL Editor.
3. Se quiser dados iniciais, rode `supabase/seed.sql`.
4. Crie um `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Como criar usuarios manualmente

1. No painel do Supabase, va em `Authentication > Users`.
2. Crie o usuario com e-mail e senha.
3. Copie o `UUID` do usuario criado.
4. Rode um SQL como este para ajustar o perfil global:

```sql
insert into public.profiles (id, full_name, avatar_label, role)
values ('UUID_DO_USUARIO', 'Nome da Pessoa', 'NP', 'seller')
on conflict (id) do update
set
  full_name = excluded.full_name,
  avatar_label = excluded.avatar_label,
  role = excluded.role;
```

5. Rode um SQL como este para vincular o usuario a uma festa:

```sql
insert into public.event_memberships (event_id, user_id, role, ticket_quota, is_active)
values ('UUID_DO_EVENTO', 'UUID_DO_USUARIO', 'seller', 50, true)
on conflict (event_id, user_id) do update
set
  role = excluded.role,
  ticket_quota = excluded.ticket_quota,
  is_active = excluded.is_active;
```

## Auth no painel do Supabase

- `Authentication > Providers > Email`: habilitado
- como nao existe cadastro publico, voce pode manter `Confirm email` desligado para simplificar
- `Site URL`:
  - local: `http://localhost:3000`
  - deploy: `https://seu-site.netlify.app`

## Como rodar

```bash
npm install
npm run dev
```

## Validacao local

- `npm run lint`
- `npm run build`
