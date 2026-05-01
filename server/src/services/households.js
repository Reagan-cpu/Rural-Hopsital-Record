import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';
import { applyLocationScope, isHouseholdObjectInScope } from '../middleware/scopeToUserLocations.js';

const COLS = 'id, malaria_number, address_line, village, district, state, pincode, status, migrated_at, notes, created_by, head_member_id, head_member:members!households_head_member_id_fkey(full_name), state_id, district_id, village_id, latitude, longitude, location_accuracy_m, location_source, created_at, updated_at';

export async function listHouseholds({ malaria_number, village, status, q, unclassified, limit, offset }, scope) {
  // Non-admin with no assignments → return nothing immediately
  if (scope && !scope.isAdmin && scope.districtIds.length === 0 && scope.villageIds.length === 0) {
    return { items: [], total: 0, limit, offset };
  }

  // fuzzy member-name search — delegates to rpc_search_households (uses pg_trgm)
  if (q) {
    const { data, error } = await supabaseAdmin.rpc('rpc_search_households', {
      p_q:              q,
      p_malaria_number: malaria_number ?? null,
      p_village:        village        ?? null,
      p_status:         status         ?? null,
      p_limit:          limit,
      p_offset:         offset,
      p_district_ids:   scope && !scope.isAdmin ? scope.districtIds : null,
      p_village_ids:    scope && !scope.isAdmin ? scope.villageIds  : null,
    });
    if (error) throw new AppError('INTERNAL', error.message, 500);
    const total = data.length > 0 ? Number(data[0].total_count) : 0;
    const items = data.map(({ total_count, head_member_name, ...row }) => ({
      ...row,
      head_member: head_member_name ? { full_name: head_member_name } : null,
    }));
    return { items, total, limit, offset };
  }

  let query = supabaseAdmin
    .from('households')
    .select(COLS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (malaria_number) query = query.ilike('malaria_number', `%${malaria_number}%`);
  if (village)        query = query.ilike('village', `%${village}%`);
  if (status)         query = query.eq('status', status);
  if (unclassified)   query = query.is('district_id', null);

  if (scope && !unclassified) query = applyLocationScope(query, scope);

  // TODO: count: 'exact' becomes expensive past ~10k rows; switch to estimated count or cursor pagination if this table grows large
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);

  // UI Fix: Bulk fallback for missing head pointers
  const missingHeadIds = data.filter(h => !h.head_member).map(h => h.id);
  if (missingHeadIds.length > 0) {
    const { data: fallbackHeads } = await supabaseAdmin
      .from('members')
      .select('household_id, full_name')
      .in('household_id', missingHeadIds)
      .eq('is_head', true)
      .eq('status', 'active');
    
    if (fallbackHeads) {
      const headMap = Object.fromEntries(fallbackHeads.map(h => [h.household_id, { full_name: h.full_name }]));
      data.forEach(h => {
        if (!h.head_member && headMap[h.id]) h.head_member = headMap[h.id];
      });
    }
  }

  return { items: data, total: count, limit, offset };
}

export function assertHouseholdInScope(household, scope) {
  if (!scope) return;
  if (!isHouseholdObjectInScope(household, scope)) {
    throw new AppError('FORBIDDEN', 'This household is outside your assigned area', 403);
  }
}

export async function getHousehold(id) {
  const { data, error } = await supabaseAdmin
    .from('households')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Household not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  
  // UI Fix: Fallback to find head if direct pointer is missing
  if (!data.head_member) {
    const { data: head } = await supabaseAdmin
      .from('members')
      .select('full_name')
      .eq('household_id', id)
      .eq('is_head', true)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (head) data.head_member = head;
  }
  
  return data;
}

export async function createHousehold(payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('households')
    .insert({ ...payload, created_by: actorId })
    .select(COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Malaria number already exists', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'households', recordId: data.id, newData: data });
  return data;
}

export async function updateHousehold(id, payload, actorId) {
  const existing = await getHousehold(id);
  const { data, error } = await supabaseAdmin
    .from('households')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'households', recordId: id, oldData: existing, newData: data });
  return data;
}

export async function changeHouseholdHead(householdId, newHeadMemberId, actorId) {
  const { error } = await supabaseAdmin.rpc('rpc_change_household_head', {
    p_household_id: householdId,
    p_new_head_id: newHeadMemberId,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
}

export async function migrateHousehold(householdId, migratedDate, actorId) {
  const { error } = await supabaseAdmin.rpc('rpc_mark_migrated', {
    p_household_id: householdId,
    p_migrated_date: migratedDate,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
}

export async function dissolveHousehold(householdId, actorId) {
  const existing = await getHousehold(householdId);
  const { data, error } = await supabaseAdmin
    .from('households')
    .update({ status: 'dissolved', updated_at: new Date().toISOString() })
    .eq('id', householdId)
    .select(COLS)
    .single();

  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'status_change', tableName: 'households', recordId: householdId, oldData: existing, newData: data });
}
