import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

export async function searchPersons({ q, limit = 20, offset = 0 }, scope) {
  if (scope && !scope.isAdmin && scope.districtIds.length === 0 && scope.villageIds.length === 0) {
    return { items: [], total: 0, limit, offset };
  }

  const trimmed = q?.trim() ?? '';
  if (!trimmed || trimmed.length < 2) {
    let query = supabaseAdmin
      .from('members')
      .select('id, household_id, full_name, gender, date_of_birth, health_id, status, contact_number, households:households!members_household_id_fkey(malaria_number, village, district, district_id, village_id)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (scope && !scope.isAdmin) {
      const districtIds = scope.districtIds ?? [];
      const villageIds = scope.villageIds ?? [];
      if (districtIds.length || villageIds.length) {
        const districtList = districtIds.join(',');
        const villageList = villageIds.join(',');
        query = query.or(`district_id.in.(${districtList}),village_id.in.(${villageList})`, { foreignTable: 'households' });
      }
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw new AppError('INTERNAL', error.message, 500);

    const items = (data ?? []).map((m) => ({
      id: m.id,
      household_id: m.household_id,
      full_name: m.full_name,
      gender: m.gender,
      date_of_birth: m.date_of_birth,
      health_id: m.health_id,
      status: m.status,
      contact_number: m.contact_number,
      malaria_number: m.households?.malaria_number,
      village: m.households?.village,
      district: m.households?.district,
    }));

    return { items, total: count ?? 0, limit, offset };
  }

  const { data, error } = await supabaseAdmin.rpc('rpc_search_person', {
    p_q:            trimmed,
    p_limit:        limit,
    p_offset:       offset,
    p_district_ids: scope && !scope.isAdmin ? scope.districtIds : null,
    p_village_ids:  scope && !scope.isAdmin ? scope.villageIds  : null,
  });

  if (error) throw new AppError('INTERNAL', error.message, 500);

  const total = data?.[0]?.total_count ?? 0;
  const items = (data ?? []).map(({ total_count: _tc, ...rest }) => rest);

  return { items, total: Number(total), limit, offset };
}
