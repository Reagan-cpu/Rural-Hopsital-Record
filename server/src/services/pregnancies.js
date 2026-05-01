import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';
import { scheduleNotification } from './notifications.js';

const PREG_COLS = 'id, member_id, lmp_date, expected_due_date, actual_delivery_date, risk_level, status, notes, registered_at, assigned_doctor_id, assigned_staff_id, complications, risk_factors, missed_checkup_count, created_at, updated_at';

function addTrimester(preg) {
  if (!preg || !preg.lmp_date) return preg;
  const daysPregnant = Math.floor((Date.now() - new Date(preg.lmp_date)) / 86_400_000);
  const trimester = daysPregnant < 84 ? 1 : daysPregnant < 189 ? 2 : 3;
  return { ...preg, trimester };
}
const CHECKUP_COLS = 'id, pregnancy_id, checkup_date, week_number, weight_kg, bp_systolic, bp_diastolic, hemoglobin, doctor_id, notes, next_checkup_date, created_at, updated_at';

export async function listPregnancies(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('pregnancies')
    .select(PREG_COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data.map(addTrimester), total: count, limit, offset };
}

export async function getPregnancy(id) {
  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .select(PREG_COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Pregnancy not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return addTrimester(data);
}

export async function createPregnancy(memberId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .insert({ ...payload, member_id: memberId })
    .select(PREG_COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Member already has an active pregnancy', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'pregnancies', recordId: data.id, newData: data });
  return addTrimester(data);
}

export async function updatePregnancy(id, payload, actorId) {
  const existing = await getPregnancy(id);

  // Delivered pregnancies are sealed — the delivery RPC is the only correct path.
  if (existing.status === 'delivered') {
    throw new AppError('CONFLICT', 'This pregnancy has been delivered and cannot be modified.', 409);
  }
  // Closed pregnancies (terminated/miscarried) cannot be reopened.
  if (existing.status !== 'active' && payload.status && payload.status !== existing.status) {
    throw new AppError('CONFLICT', `Cannot change status of a ${existing.status} pregnancy.`, 409);
  }

  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .update(payload)
    .eq('id', id)
    .select(PREG_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'pregnancies', recordId: id, oldData: existing, newData: data });
  return addTrimester(data);
}

export async function listCheckups(pregnancyId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('pregnancy_checkups')
    .select(CHECKUP_COLS, { count: 'exact' })
    .eq('pregnancy_id', pregnancyId)
    .order('checkup_date', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function createCheckup(pregnancyId, payload, actorId) {
  const pregnancy = await getPregnancy(pregnancyId);
  if (pregnancy.status !== 'active') {
    throw new AppError('CONFLICT', 'Cannot add a checkup to a non-active pregnancy', 409);
  }
  const { data, error } = await supabaseAdmin
    .from('pregnancy_checkups')
    .insert({ ...payload, pregnancy_id: pregnancyId, doctor_id: actorId })
    .select(CHECKUP_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'pregnancy_checkups', recordId: data.id, newData: data });

  // Schedule reminder 2 days before the next checkup
  if (data.next_checkup_date) {
    const reminderDate = new Date(data.next_checkup_date);
    reminderDate.setDate(reminderDate.getDate() - 2);
    if (reminderDate > new Date()) {
      await scheduleNotification({
        recipientUserId: actorId,
        type: 'checkup_reminder',
        message: `Upcoming pregnancy checkup scheduled for ${data.next_checkup_date}.`,
        scheduledFor: reminderDate.toISOString(),
        relatedEntityType: 'pregnancy_checkup',
        relatedEntityId: data.id,
      }).catch(() => { });
    }
  }

  return data;
}

export async function listAllPregnancies({ assignedDoctorId, status, riskLevel, limit, offset }, scope) {
  const selection = `
    ${PREG_COLS},
    member:member_id (
      full_name,
      contact_number
    )
  `;

  let q = supabaseAdmin
    .from('pregnancies')
    .select(selection, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (assignedDoctorId) q = q.eq('assigned_doctor_id', assignedDoctorId);
  if (status)           q = q.eq('status', status);
  if (riskLevel)        q = q.eq('risk_level', riskLevel);

  // Non-admin scoping: only show pregnancies whose member belongs to
  // a household that is visible to this user.
  if (scope && !scope.isAdmin) {
    const { districtIds, villageIds } = scope;

    if (districtIds.length === 0 && villageIds.length === 0) {
      return { items: [], total: 0, limit, offset };
    }

    // 1. Fetch the IDs of households the user can see (same logic as Households page)
    let hhQuery = supabaseAdmin
      .from('households')
      .select('id');

    const locationFilters = [];
    if (districtIds.length > 0) locationFilters.push(`district_id.in.(${districtIds.map(id => `"${id}"`).join(',')})`);
    if (villageIds.length  > 0) locationFilters.push(`village_id.in.(${villageIds.map(id => `"${id}"`).join(',')})`);

    hhQuery = hhQuery.or(locationFilters.join(','));

    const { data: hhData, error: hhError } = await hhQuery;
    if (hhError) throw new AppError('INTERNAL', hhError.message, 500);

    if (!hhData || hhData.length === 0) {
      return { items: [], total: 0, limit, offset };
    }

    const householdIds = hhData.map(h => h.id);

    // 2. Get member IDs from those households
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id')
      .in('household_id', householdIds);

    if (memberError) throw new AppError('INTERNAL', memberError.message, 500);
    if (!memberData || memberData.length === 0) {
      return { items: [], total: 0, limit, offset };
    }

    const memberIds = memberData.map(m => m.id);

    // 3. Filter pregnancies to only those members
    q = q.in('member_id', memberIds);
  }

  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);

  const items = (data || []).map(p => {
    const enriched = addTrimester(p);
    return {
      ...enriched,
      member_name: p.member?.full_name || 'Unknown',
      member_contact: p.member?.contact_number,
    };
  });

  return { items, total: count, limit, offset };
}

export async function registerDelivery(pregnancyId, newbornData, actorId) {
  const { data, error } = await supabaseAdmin.rpc('rpc_register_delivery', {
    p_pregnancy_id: pregnancyId,
    p_newborn_data: newbornData,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
  return { new_member_id: data };
}
