-- Run this file in the Supabase SQL Editor when the app reports a missing RPC
-- in the PostgREST schema cache. It recreates the transactional RPC contract
-- used by the app and asks PostgREST to reload its schema cache.

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

notify pgrst, 'reload schema';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_event_with_config',
    'create_sale_with_attendees',
    'update_sale_with_attendees'
  )
order by routine_name;
