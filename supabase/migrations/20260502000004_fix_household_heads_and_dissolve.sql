-- 1. Backfill head_member_id for households that have a head member but no pointer
update public.households h
set head_member_id = (
  select m.id from public.members m
  where m.household_id = h.id
    and m.is_head = true
    and m.status = 'active'
  limit 1
)
where h.head_member_id is null;

-- 2. Trigger function to keep household.head_member_id in sync
create or replace function public.fn_sync_household_head()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and NEW.is_head = true then
    -- update the household to point to this member
    update public.households
    set head_member_id = NEW.id
    where id = NEW.household_id;
    
    -- ensure no other member in this household is marked as head
    update public.members
    set is_head = false
    where household_id = NEW.household_id
      and id != NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_household_head on public.members;
create trigger trg_sync_household_head
  after insert or update of is_head on public.members
  for each row
  when (NEW.is_head = true)
  execute function public.fn_sync_household_head();

-- 3. rpc_mark_dissolved
create or replace function public.rpc_mark_dissolved(
  p_household_id uuid,
  p_actor_id     uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_status text;
begin
  select status into v_old_status from public.households where id = p_household_id;
  
  if not found then
    raise exception 'Household not found';
  end if;
  
  update public.households
  set status = 'dissolved', updated_at = now()
  where id = p_household_id;
  
  -- Audit
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    p_actor_id, 'status_change', 'households', p_household_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'dissolved')
  );
end;
$$;

-- 4. Update Deaths & Migrations report to include dissolutions
create or replace function public.rpc_report_deaths_migrations(p_days int default 30)
returns table (event_type text, count bigint)
language sql stable security definer set search_path = public as $$
  select 'deaths' as event_type, count(*) from members
    where status = 'deceased' and deceased_date >= current_date - p_days
  union all
  select 'member_migrations', count(*) from members
    where status = 'migrated' and migrated_date >= current_date - p_days
  union all
  select 'household_migrations', count(*) from households
    where status = 'migrated' and migrated_at >= now() - (p_days || ' days')::interval
  union all
  select 'household_dissolutions', count(*) from households
    where status = 'dissolved' and updated_at >= now() - (p_days || ' days')::interval;
$$;

-- 5. Improve rpc_search_households to be more robust
create or replace function public.rpc_search_households(
  p_q              text,
  p_malaria_number text     default null,
  p_village        text     default null,
  p_status         text     default null,
  p_limit          int      default 20,
  p_offset         int      default 0,
  p_district_ids   uuid[]   default null,
  p_village_ids    uuid[]   default null
)
returns table (
  id             uuid,  malaria_number text, address_line text,
  village        text,  district       text, state        text,
  pincode        text,  status         text, migrated_at  timestamptz,
  notes          text,  created_by     uuid, head_member_id uuid,
  head_member_name text,
  state_id       uuid,  district_id    uuid, village_id   uuid,
  created_at     timestamptz, updated_at timestamptz, total_count bigint
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  if p_district_ids is not null
     and array_length(p_district_ids, 1) is null
     and p_village_ids is not null
     and array_length(p_village_ids, 1) is null
  then return; end if;

  return query
  with matched as (
    select distinct h.id
    from households h
    join members m on m.household_id = h.id
    where (m.full_name % p_q or h.malaria_number ilike '%' || p_q || '%')
      and (p_malaria_number is null or h.malaria_number ilike '%' || p_malaria_number || '%')
      and (p_village        is null or h.village        ilike '%' || p_village        || '%')
      and (p_status         is null or h.status         = p_status)
      and (p_district_ids   is null or h.district_id = any(p_district_ids) or h.village_id = any(p_village_ids))
  ),
  total as (select count(*) as cnt from matched)
  select h.id, h.malaria_number, h.address_line, h.village, h.district, h.state,
    h.pincode, h.status, h.migrated_at, h.notes, h.created_by, h.head_member_id,
    coalesce(hm.full_name, (select m.full_name from members m where m.household_id = h.id and m.is_head limit 1)) as head_member_name,
    h.state_id, h.district_id, h.village_id, h.created_at, h.updated_at, total.cnt
  from households h
    join matched using (id)
    left join members hm on hm.id = h.head_member_id
    cross join total
  order by h.created_at desc
  limit p_limit offset p_offset;
end;
$$;
