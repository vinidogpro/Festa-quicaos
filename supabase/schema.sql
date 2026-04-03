create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_label text,
  role text not null default 'seller' check (role in ('admin', 'organizer', 'seller')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  venue text not null,
  description text,
  event_date timestamptz not null,
  goal_value numeric(12,2) not null default 0,
  status text not null check (status in ('current', 'upcoming', 'past')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  ticket_quota integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, profile_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('paid', 'pending')),
  sold_at date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  incurred_at date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'done')),
  due_at date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_label, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 2)),
    coalesce((new.raw_user_meta_data ->> 'role')::text, 'seller')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_profile_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_event(target_event_id uuid)
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'organizer')
    )
    or exists (
      select 1
      from public.sellers
      where event_id = target_event_id
        and profile_id = auth.uid()
    )
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.sellers enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

drop policy if exists "events_select_accessible" on public.events;
create policy "events_select_accessible"
  on public.events for select
  using (public.can_access_event(id));

drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write"
  on public.events for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "sellers_select_accessible" on public.sellers;
create policy "sellers_select_accessible"
  on public.sellers for select
  using (public.can_access_event(event_id));

drop policy if exists "sellers_admin_organizer_write" on public.sellers;
create policy "sellers_admin_organizer_write"
  on public.sellers for all
  using (public.current_profile_role() in ('admin', 'organizer'))
  with check (public.current_profile_role() in ('admin', 'organizer'));

drop policy if exists "sales_select_accessible" on public.sales;
create policy "sales_select_accessible"
  on public.sales for select
  using (public.can_access_event(event_id));

drop policy if exists "sales_admin_organizer_write" on public.sales;
create policy "sales_admin_organizer_write"
  on public.sales for all
  using (public.current_profile_role() in ('admin', 'organizer'))
  with check (public.current_profile_role() in ('admin', 'organizer'));

drop policy if exists "sales_seller_insert_own" on public.sales;
create policy "sales_seller_insert_own"
  on public.sales for insert
  with check (
    public.current_profile_role() = 'seller'
    and exists (
      select 1
      from public.sellers
      where id = seller_id
        and profile_id = auth.uid()
    )
  );

drop policy if exists "sales_seller_update_own" on public.sales;
create policy "sales_seller_update_own"
  on public.sales for update
  using (
    public.current_profile_role() = 'seller'
    and exists (
      select 1
      from public.sellers
      where id = seller_id
        and profile_id = auth.uid()
    )
  )
  with check (
    public.current_profile_role() = 'seller'
    and exists (
      select 1
      from public.sellers
      where id = seller_id
        and profile_id = auth.uid()
    )
  );

drop policy if exists "expenses_select_accessible" on public.expenses;
create policy "expenses_select_accessible"
  on public.expenses for select
  using (public.can_access_event(event_id));

drop policy if exists "expenses_admin_write" on public.expenses;
create policy "expenses_admin_write"
  on public.expenses for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "tasks_select_accessible" on public.tasks;
create policy "tasks_select_accessible"
  on public.tasks for select
  using (public.can_access_event(event_id));

drop policy if exists "tasks_admin_organizer_write" on public.tasks;
create policy "tasks_admin_organizer_write"
  on public.tasks for all
  using (public.current_profile_role() in ('admin', 'organizer'))
  with check (public.current_profile_role() in ('admin', 'organizer'));

drop policy if exists "announcements_select_accessible" on public.announcements;
create policy "announcements_select_accessible"
  on public.announcements for select
  using (public.can_access_event(event_id));

drop policy if exists "announcements_admin_organizer_write" on public.announcements;
create policy "announcements_admin_organizer_write"
  on public.announcements for all
  using (public.current_profile_role() in ('admin', 'organizer'))
  with check (public.current_profile_role() in ('admin', 'organizer'));
