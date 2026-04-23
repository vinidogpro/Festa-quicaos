create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_label text,
  role text not null default 'seller' check (role in ('host', 'organizer', 'seller')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_memberships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('host', 'organizer', 'seller')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, user_id)
);

create table if not exists public.event_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, name)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  batch_id uuid not null references public.event_batches (id) on delete restrict,
  sale_type text not null default 'normal' check (sale_type in ('normal', 'grupo')),
  ticket_type text not null default 'pista' check (ticket_type in ('vip', 'pista')),
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  payment_status text not null default 'paid' check (payment_status = 'paid'),
  sold_at date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sale_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  guest_name text not null,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.manual_guest_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_name text not null,
  notes text,
  source_type text not null default 'manual' check (source_type = 'manual'),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.additional_revenues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text,
  date date not null default current_date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'done')),
  due_at date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  actor_user_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.events add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.event_memberships add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.event_memberships drop column if exists ticket_quota;
alter table public.event_batches add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.sales add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.sales add column if not exists batch_id uuid references public.event_batches (id) on delete restrict;
alter table public.sales add column if not exists sale_type text not null default 'normal';
alter table public.sales add column if not exists ticket_type text not null default 'pista';
alter table public.sale_attendees add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.manual_guest_entries add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.expenses add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.additional_revenues add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.tasks add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.announcements add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.activity_logs add column if not exists updated_at timestamptz not null default timezone('utc', now());

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
    'seller'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_label = excluded.avatar_label;

  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_event_memberships_updated_at on public.event_memberships;
create trigger set_event_memberships_updated_at
  before update on public.event_memberships
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_event_batches_updated_at on public.event_batches;
create trigger set_event_batches_updated_at
  before update on public.event_batches
  for each row execute procedure public.set_updated_at();

drop trigger if exists enforce_event_membership_quota on public.event_memberships;

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at
  before update on public.sales
  for each row execute procedure public.set_updated_at();

drop trigger if exists enforce_sales_quota on public.sales;

drop trigger if exists set_sale_attendees_updated_at on public.sale_attendees;
create trigger set_sale_attendees_updated_at
  before update on public.sale_attendees
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_manual_guest_entries_updated_at on public.manual_guest_entries;
create trigger set_manual_guest_entries_updated_at
  before update on public.manual_guest_entries
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_additional_revenues_updated_at on public.additional_revenues;
create trigger set_additional_revenues_updated_at
  before update on public.additional_revenues
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_activity_logs_updated_at on public.activity_logs;
create trigger set_activity_logs_updated_at
  before update on public.activity_logs
  for each row execute procedure public.set_updated_at();

alter table public.sales drop constraint if exists sales_unit_price_positive;
alter table public.sales add constraint sales_unit_price_positive check (unit_price > 0);
alter table public.sales drop constraint if exists sales_quantity_positive;
alter table public.sales add constraint sales_quantity_positive check (quantity > 0);
update public.sales set ticket_type = 'pista' where ticket_type is null;
update public.sales set sale_type = 'normal' where sale_type is null;
alter table public.sales alter column sale_type set default 'normal';
alter table public.sales drop constraint if exists sales_sale_type_check;
alter table public.sales add constraint sales_sale_type_check check (sale_type in ('normal', 'grupo'));
alter table public.sales alter column ticket_type set default 'pista';
alter table public.sales drop constraint if exists sales_ticket_type_check;
alter table public.sales add constraint sales_ticket_type_check check (ticket_type in ('vip', 'pista'));
insert into public.event_batches (event_id, name)
select events.id, '1º lote'
from public.events
where not exists (
  select 1
  from public.event_batches
  where event_batches.event_id = events.id
);

update public.sales
set batch_id = event_batches.id
from public.event_batches
where public.sales.event_id = event_batches.event_id
  and event_batches.name = '1º lote'
  and public.sales.batch_id is null;

alter table public.sales alter column batch_id set not null;
alter table public.sales drop column if exists batch_label;
update public.sales set payment_status = 'paid' where payment_status is distinct from 'paid';
alter table public.sales alter column payment_status set default 'paid';
alter table public.sales drop constraint if exists sales_payment_status_check;
alter table public.sales add constraint sales_payment_status_check check (payment_status = 'paid');
alter table public.expenses drop constraint if exists expenses_amount_positive;
alter table public.expenses add constraint expenses_amount_positive check (amount > 0);
alter table public.additional_revenues drop constraint if exists additional_revenues_amount_positive;
alter table public.additional_revenues add constraint additional_revenues_amount_positive check (amount > 0);
drop function if exists public.enforce_sale_quota();
drop function if exists public.enforce_membership_quota();

create or replace function public.current_global_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.membership_role(target_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.event_memberships
  where event_id = target_event_id
    and user_id = auth.uid()
  limit 1
$$;

create or replace function public.can_access_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_global_role() = 'host'
    or exists (
      select 1
      from public.event_memberships
      where event_id = target_event_id
        and user_id = auth.uid()
    )
$$;

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_global_role() = 'host'
    or public.membership_role(target_event_id) in ('host', 'organizer')
$$;

create or replace function public.can_manage_sale(target_event_id uuid, target_seller_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_global_role() = 'host'
    or public.membership_role(target_event_id) in ('host', 'organizer')
    or (
      public.membership_role(target_event_id) = 'seller'
      and target_seller_user_id = auth.uid()
    )
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_memberships enable row level security;
alter table public.event_batches enable row level security;
alter table public.sales enable row level security;
alter table public.sale_attendees enable row level security;
alter table public.manual_guest_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.additional_revenues enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "profiles_select_self_or_host" on public.profiles;
create policy "profiles_select_self_or_host"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_global_role() = 'host'
    or exists (
      select 1
      from public.event_memberships as viewer_membership
      join public.event_memberships as target_membership
        on target_membership.event_id = viewer_membership.event_id
      where viewer_membership.user_id = auth.uid()
        and viewer_membership.is_active = true
        and target_membership.is_active = true
        and target_membership.user_id = profiles.id
    )
  );

drop policy if exists "profiles_update_host" on public.profiles;
create policy "profiles_update_host"
  on public.profiles for update
  using (public.current_global_role() = 'host')
  with check (public.current_global_role() = 'host');

drop policy if exists "events_select_accessible" on public.events;
create policy "events_select_accessible"
  on public.events for select
  using (public.can_access_event(id));

drop policy if exists "events_write_host_only" on public.events;
create policy "events_write_host_only"
  on public.events for all
  using (public.current_global_role() = 'host' or public.membership_role(id) = 'host')
  with check (public.current_global_role() = 'host' or public.membership_role(id) = 'host');

drop policy if exists "event_memberships_select_accessible" on public.event_memberships;
create policy "event_memberships_select_accessible"
  on public.event_memberships for select
  using (public.can_access_event(event_id));

drop policy if exists "event_memberships_write_host_only" on public.event_memberships;
drop policy if exists "event_memberships_write_managers" on public.event_memberships;
create policy "event_memberships_write_managers"
  on public.event_memberships for all
  using (
    public.can_manage_event(event_id)
    and (
      public.membership_role(event_id) = 'host'
      or role <> 'host'
    )
  )
  with check (
    public.can_manage_event(event_id)
    and (
      public.membership_role(event_id) = 'host'
      or role <> 'host'
    )
  );

drop policy if exists "event_batches_select_accessible" on public.event_batches;
create policy "event_batches_select_accessible"
  on public.event_batches for select
  using (public.can_access_event(event_id));

drop policy if exists "event_batches_write_hosts_only" on public.event_batches;
create policy "event_batches_write_hosts_only"
  on public.event_batches for all
  using (public.current_global_role() = 'host' or public.membership_role(event_id) = 'host')
  with check (public.current_global_role() = 'host' or public.membership_role(event_id) = 'host');

drop policy if exists "sales_select_accessible" on public.sales;
create policy "sales_select_accessible"
  on public.sales for select
  using (public.can_access_event(event_id));

drop policy if exists "sales_insert_with_membership_rules" on public.sales;
create policy "sales_insert_with_membership_rules"
  on public.sales for insert
  with check (
    public.can_manage_sale(event_id, seller_user_id)
    and exists (
      select 1
      from public.event_memberships
      where event_id = sales.event_id
        and user_id = sales.seller_user_id
        and role = 'seller'
    )
  );

drop policy if exists "sales_update_with_membership_rules" on public.sales;
create policy "sales_update_with_membership_rules"
  on public.sales for update
  using (public.can_manage_sale(event_id, seller_user_id))
  with check (
    public.can_manage_sale(event_id, seller_user_id)
    and exists (
      select 1
      from public.event_memberships
      where event_id = sales.event_id
        and user_id = sales.seller_user_id
        and role = 'seller'
    )
  );

drop policy if exists "sales_delete_host_or_event_host" on public.sales;
drop policy if exists "sales_delete_with_membership_rules" on public.sales;
create policy "sales_delete_with_membership_rules"
  on public.sales for delete
  using (public.can_manage_sale(event_id, seller_user_id));

drop policy if exists "sale_attendees_select_accessible" on public.sale_attendees;
create policy "sale_attendees_select_accessible"
  on public.sale_attendees for select
  using (public.can_manage_sale(event_id, seller_user_id));

drop policy if exists "sale_attendees_insert_accessible" on public.sale_attendees;
create policy "sale_attendees_insert_accessible"
  on public.sale_attendees for insert
  with check (
    public.can_manage_sale(event_id, seller_user_id)
    and exists (
      select 1
      from public.sales
      where sales.id = sale_attendees.sale_id
        and sales.event_id = sale_attendees.event_id
        and sales.seller_user_id = sale_attendees.seller_user_id
    )
  );

drop policy if exists "sale_attendees_update_accessible" on public.sale_attendees;
create policy "sale_attendees_update_accessible"
  on public.sale_attendees for update
  using (public.can_manage_sale(event_id, seller_user_id))
  with check (
    public.can_manage_sale(event_id, seller_user_id)
    and exists (
      select 1
      from public.sales
      where sales.id = sale_attendees.sale_id
        and sales.event_id = sale_attendees.event_id
        and sales.seller_user_id = sale_attendees.seller_user_id
    )
  );

drop policy if exists "sale_attendees_delete_accessible" on public.sale_attendees;
create policy "sale_attendees_delete_accessible"
  on public.sale_attendees for delete
  using (public.can_manage_sale(event_id, seller_user_id));

drop policy if exists "manual_guest_entries_select_accessible" on public.manual_guest_entries;
create policy "manual_guest_entries_select_accessible"
  on public.manual_guest_entries for select
  using (public.can_access_event(event_id));

drop policy if exists "manual_guest_entries_write_hosts_only" on public.manual_guest_entries;
create policy "manual_guest_entries_write_hosts_only"
  on public.manual_guest_entries for all
  using (public.current_global_role() = 'host' or public.membership_role(event_id) = 'host')
  with check (public.current_global_role() = 'host' or public.membership_role(event_id) = 'host');

drop policy if exists "expenses_select_accessible" on public.expenses;
create policy "expenses_select_accessible"
  on public.expenses for select
  using (public.can_access_event(event_id));

drop policy if exists "expenses_write_host_or_event_host" on public.expenses;
create policy "expenses_write_host_or_event_host"
  on public.expenses for all
  using (public.current_global_role() = 'host' or public.membership_role(event_id) in ('host', 'organizer'))
  with check (public.current_global_role() = 'host' or public.membership_role(event_id) in ('host', 'organizer'));

drop policy if exists "additional_revenues_select_accessible" on public.additional_revenues;
create policy "additional_revenues_select_accessible"
  on public.additional_revenues for select
  using (public.can_access_event(event_id));

drop policy if exists "additional_revenues_write_host_or_event_host" on public.additional_revenues;
create policy "additional_revenues_write_host_or_event_host"
  on public.additional_revenues for all
  using (public.current_global_role() = 'host' or public.membership_role(event_id) in ('host', 'organizer'))
  with check (public.current_global_role() = 'host' or public.membership_role(event_id) in ('host', 'organizer'));

drop policy if exists "tasks_select_accessible" on public.tasks;
create policy "tasks_select_accessible"
  on public.tasks for select
  using (public.can_access_event(event_id));

drop policy if exists "tasks_write_managers" on public.tasks;
create policy "tasks_write_managers"
  on public.tasks for all
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

drop policy if exists "announcements_select_accessible" on public.announcements;
create policy "announcements_select_accessible"
  on public.announcements for select
  using (public.can_access_event(event_id));

drop policy if exists "announcements_write_managers" on public.announcements;
create policy "announcements_write_managers"
  on public.announcements for all
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

drop policy if exists "activity_logs_select_hosts_only" on public.activity_logs;
create policy "activity_logs_select_hosts_only"
  on public.activity_logs for select
  using (
    public.current_global_role() = 'host'
    or (
      event_id is not null
      and public.membership_role(event_id) = 'host'
    )
  );

drop policy if exists "activity_logs_insert_authenticated_actor" on public.activity_logs;
create policy "activity_logs_insert_authenticated_actor"
  on public.activity_logs for insert
  with check (
    actor_user_id = auth.uid()
    and (
      event_id is null
      or public.can_access_event(event_id)
    )
  );
