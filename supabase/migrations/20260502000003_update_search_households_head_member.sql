-- Add head member name to household search RPC
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
    where m.full_name % p_q
      and (p_malaria_number is null or h.malaria_number ilike '%' || p_malaria_number || '%')
      and (p_village        is null or h.village        ilike '%' || p_village        || '%')
      and (p_status         is null or h.status         = p_status)
      and (p_district_ids   is null or h.district_id = any(p_district_ids) or h.village_id = any(p_village_ids))
  ),
  total as (select count(*) as cnt from matched)
  select h.id, h.malaria_number, h.address_line, h.village, h.district, h.state,
    h.pincode, h.status, h.migrated_at, h.notes, h.created_by, h.head_member_id,
    hm.full_name as head_member_name,
    h.state_id, h.district_id, h.village_id, h.created_at, h.updated_at, total.cnt
  from households h
    join matched using (id)
    left join members hm on hm.id = h.head_member_id
    cross join total
  order by h.created_at desc
  limit p_limit offset p_offset;
end;
$$;
