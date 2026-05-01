import { validate } from '../lib/validate.js';
import {
  createHouseholdSchema,
  updateHouseholdSchema,
  searchHouseholdsSchema,
  changeHeadSchema,
  migrateHouseholdSchema,
} from '../../../shared/schemas/households.js';
import * as svc from '../services/households.js';
import { findSimilarHouseholds } from '../services/duplicateDetection.js';

export async function list(req, res) {
  const query = validate(searchHouseholdsSchema, req.query);
  const result = await svc.listHouseholds(query, req.locationScope);
  res.json({ data: result, error: null });
}

export async function getOne(req, res) {
  const household = await svc.getHousehold(req.params.id);
  svc.assertHouseholdInScope(household, req.locationScope);
  res.json({ data: household, error: null });
}

export async function create(req, res) {
  const payload = validate(createHouseholdSchema, req.body);
  const household = await svc.createHousehold(payload, req.profile.id);
  res.status(201).json({ data: household, error: null });
}

export async function update(req, res) {
  const payload = validate(updateHouseholdSchema, req.body);
  const existing = await svc.getHousehold(req.params.id);
  svc.assertHouseholdInScope(existing, req.locationScope);
  const household = await svc.updateHousehold(req.params.id, payload, req.profile.id);
  res.json({ data: household, error: null });
}

export async function changeHead(req, res) {
  const { new_head_member_id } = validate(changeHeadSchema, req.body);
  const household = await svc.getHousehold(req.params.id);
  svc.assertHouseholdInScope(household, req.locationScope);
  await svc.changeHouseholdHead(req.params.id, new_head_member_id, req.profile.id);
  res.json({ data: { success: true }, error: null });
}

export async function migrate(req, res) {
  const { migrated_date } = validate(migrateHouseholdSchema, req.body);
  const household = await svc.getHousehold(req.params.id);
  svc.assertHouseholdInScope(household, req.locationScope);
  await svc.migrateHousehold(req.params.id, migrated_date, req.profile.id);
  res.json({ data: { success: true }, error: null });
}

export async function dissolve(req, res) {
  const household = await svc.getHousehold(req.params.id);
  svc.assertHouseholdInScope(household, req.locationScope);
  await svc.dissolveHousehold(req.params.id, req.profile.id);
  res.json({ data: { success: true }, error: null });
}

export async function checkDuplicates(req, res) {
  const { village, head_name } = req.query;
  const data = await findSimilarHouseholds({ village, headName: head_name });
  res.json({ data, error: null });
}

export async function listForMap(req, res) {
  const { data, error } = await import('../lib/supabaseAdmin.js').then(({ supabaseAdmin }) =>
    supabaseAdmin
      .from('households')
      .select('id, malaria_number, village, latitude, longitude, status')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('status', 'active')
      .limit(500)
  );
  if (error) return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  res.json({ data, error: null });
}
