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
  has_vip boolean not null default true,
  has_group_sales boolean not null default true,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
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
  pista_price numeric(12,2),
  vip_price numeric(12,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
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
alter table public.events add column if not exists has_vip boolean not null default true;
alter table public.events add column if not exists has_group_sales boolean not null default true;
alter table public.events add column if not exists closed_at timestamptz;
alter table public.events add column if not exists closed_by uuid references public.profiles (id) on delete set null;
alter table public.event_memberships add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.event_memberships drop column if exists ticket_quota;
alter table public.event_batches add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.event_batches add column if not exists pista_price numeric(12,2);
alter table public.event_batches add column if not exists vip_price numeric(12,2);
alter table public.event_batches add column if not exists is_active boolean not null default true;
alter table public.event_batches add column if not exists sort_order integer not null default 0;
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
update public.event_batches set is_active = true where is_active is null;
update public.event_batches set sort_order = 0 where sort_order is null;
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

create or replace function public.create_event_with_config(
  p_name text,
  p_slug text,
  p_venue text,
  p_description text,
  p_event_date timestamptz,
  p_goal_value numeric,
  p_has_vip boolean,
  p_has_group_sales boolean,
  p_status text,
  p_created_by uuid,
  p_batches jsonb
)
returns table(event_id uuid, event_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event_id uuid;
  batch_item jsonb;
  batch_index integer := 0;
begin
  if auth.uid() is distinct from p_created_by then
    raise exception 'Usuario autenticado nao confere com o criador informado.';
  end if;

  if public.current_global_role() <> 'host' then
    raise exception 'Apenas host global pode criar festas.';
  end if;

  if jsonb_typeof(p_batches) is distinct from 'array' or jsonb_array_length(p_batches) = 0 then
    raise exception 'Informe pelo menos um lote para criar a festa.';
  end if;

  insert into public.events (
    name,
    slug,
    venue,
    description,
    event_date,
    goal_value,
    has_vip,
    has_group_sales,
    status,
    created_by
  )
  values (
    p_name,
    p_slug,
    p_venue,
    nullif(p_description, ''),
    p_event_date,
    p_goal_value,
    p_has_vip,
    p_has_group_sales,
    p_status,
    p_created_by
  )
  returning id into created_event_id;

  insert into public.event_memberships (event_id, user_id, role)
  values (created_event_id, p_created_by, 'host');

  for batch_item in select value from jsonb_array_elements(p_batches)
  loop
    insert into public.event_batches (
      event_id,
      name,
      pista_price,
      vip_price,
      is_active,
      sort_order
    )
    values (
      created_event_id,
      nullif(trim(batch_item ->> 'name'), ''),
      nullif(batch_item ->> 'pistaPrice', '')::numeric,
      nullif(batch_item ->> 'vipPrice', '')::numeric,
      coalesce((batch_item ->> 'isActive')::boolean, true),
      coalesce((batch_item ->> 'sortOrder')::integer, batch_index)
    );

    batch_index := batch_index + 1;
  end loop;

  return query select created_event_id, p_slug;
end;
$$;

create or replace function public.create_sale_with_attendees(
  p_event_id uuid,
  p_seller_user_id uuid,
  p_batch_id uuid,
  p_sale_type text,
  p_ticket_type text,
  p_quantity integer,
  p_unit_price numeric,
  p_sold_at date,
  p_notes text,
  p_created_by uuid,
  p_guest_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_sale_id uuid;
  inserted_attendee_count integer;
begin
  if auth.uid() is distinct from p_created_by then
    raise exception 'Usuario autenticado nao confere com o criador informado.';
  end if;

  if not public.can_manage_sale(p_event_id, p_seller_user_id) then
    raise exception 'Voce nao tem permissao para registrar esta venda.';
  end if;

  if p_quantity <= 0 or p_quantity is null then
    raise exception 'Quantidade invalida.';
  end if;

  if p_unit_price <= 0 or p_unit_price is null then
    raise exception 'Valor unitario invalido.';
  end if;

  if coalesce(array_length(p_guest_names, 1), 0) <> p_quantity then
    raise exception 'Quantidade e nomes precisam bater antes de salvar a venda.';
  end if;

  if not exists (
    select 1
    from public.event_memberships
    where event_id = p_event_id
      and user_id = p_seller_user_id
      and role = 'seller'
  ) then
    raise exception 'O vendedor selecionado precisa estar vinculado como seller nesta festa.';
  end if;

  if not exists (
    select 1
    from public.event_batches
    where id = p_batch_id
      and event_id = p_event_id
      and is_active = true
  ) then
    raise exception 'Selecione um lote ativo para registrar a venda.';
  end if;

  insert into public.sales (
    event_id,
    seller_user_id,
    batch_id,
    sale_type,
    ticket_type,
    quantity,
    unit_price,
    payment_status,
    sold_at,
    notes,
    created_by
  )
  values (
    p_event_id,
    p_seller_user_id,
    p_batch_id,
    p_sale_type,
    p_ticket_type,
    p_quantity,
    p_unit_price,
    'paid',
    p_sold_at,
    nullif(p_notes, ''),
    p_created_by
  )
  returning id into created_sale_id;

  insert into public.sale_attendees (event_id, sale_id, seller_user_id, guest_name)
  select p_event_id, created_sale_id, p_seller_user_id, trim(guest_name)
  from unnest(p_guest_names) as guest_name
  where trim(guest_name) <> '';

  get diagnostics inserted_attendee_count = row_count;

  if inserted_attendee_count <> p_quantity then
    raise exception 'A venda foi recusada porque nem todos os nomes foram vinculados a lista.';
  end if;

  return created_sale_id;
end;
$$;

create or replace function public.update_sale_with_attendees(
  p_sale_id uuid,
  p_seller_user_id uuid,
  p_batch_id uuid,
  p_sale_type text,
  p_ticket_type text,
  p_quantity integer,
  p_unit_price numeric,
  p_sold_at date,
  p_notes text,
  p_actor_user_id uuid,
  p_guest_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_sale public.sales%rowtype;
  inserted_attendee_count integer;
begin
  if auth.uid() is distinct from p_actor_user_id then
    raise exception 'Usuario autenticado nao confere com o ator informado.';
  end if;

  select *
  into target_sale
  from public.sales
  where id = p_sale_id
  for update;

  if target_sale.id is null then
    raise exception 'Venda nao encontrada.';
  end if;

  if not public.can_manage_sale(target_sale.event_id, target_sale.seller_user_id)
    or not public.can_manage_sale(target_sale.event_id, p_seller_user_id) then
    raise exception 'Voce nao tem permissao para atualizar esta venda.';
  end if;

  if p_quantity <= 0 or p_quantity is null then
    raise exception 'Quantidade invalida.';
  end if;

  if p_unit_price <= 0 or p_unit_price is null then
    raise exception 'Valor unitario invalido.';
  end if;

  if coalesce(array_length(p_guest_names, 1), 0) <> p_quantity then
    raise exception 'Quantidade e nomes precisam bater antes de salvar a venda.';
  end if;

  if not exists (
    select 1
    from public.event_memberships
    where event_id = target_sale.event_id
      and user_id = p_seller_user_id
      and role = 'seller'
  ) then
    raise exception 'O vendedor selecionado precisa estar vinculado como seller nesta festa.';
  end if;

  if not exists (
    select 1
    from public.event_batches
    where id = p_batch_id
      and event_id = target_sale.event_id
      and (is_active = true or id = target_sale.batch_id)
  ) then
    raise exception 'Selecione um lote valido para a venda.';
  end if;

  update public.sales
  set
    seller_user_id = p_seller_user_id,
    batch_id = p_batch_id,
    sale_type = p_sale_type,
    ticket_type = p_ticket_type,
    quantity = p_quantity,
    unit_price = p_unit_price,
    payment_status = 'paid',
    sold_at = p_sold_at,
    notes = nullif(p_notes, '')
  where id = p_sale_id;

  delete from public.sale_attendees
  where sale_id = p_sale_id;

  insert into public.sale_attendees (event_id, sale_id, seller_user_id, guest_name)
  select target_sale.event_id, p_sale_id, p_seller_user_id, trim(guest_name)
  from unnest(p_guest_names) as guest_name
  where trim(guest_name) <> '';

  get diagnostics inserted_attendee_count = row_count;

  if inserted_attendee_count <> p_quantity then
    raise exception 'A venda foi recusada porque nem todos os nomes foram vinculados a lista.';
  end if;

  return p_sale_id;
end;
$$;

grant execute on function public.create_event_with_config(text, text, text, text, timestamptz, numeric, boolean, boolean, text, uuid, jsonb) to authenticated;
grant execute on function public.create_sale_with_attendees(uuid, uuid, uuid, text, text, integer, numeric, date, text, uuid, text[]) to authenticated;
grant execute on function public.update_sale_with_attendees(uuid, uuid, uuid, text, text, integer, numeric, date, text, uuid, text[]) to authenticated;

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
