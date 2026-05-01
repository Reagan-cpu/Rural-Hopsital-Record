import { validate } from '../lib/validate.js';
import { createPregnancySchema, updatePregnancySchema, createCheckupSchema, deliverSchema } from '../../../shared/schemas/pregnancies.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/pregnancies.js';

export async function listPregnancies(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listPregnancies(req.params.memberId, { limit, offset });
  res.json({ data: result, error: null });
}

// Top-level list for doctor dashboard — filters by assigned_doctor_id, status, risk_level
export async function listAll(req, res) {
  const { assigned_doctor_id, status, risk_level, limit, offset } = req.query;
  const result = await svc.listAllPregnancies({
    assignedDoctorId: assigned_doctor_id,
    status,
    riskLevel: risk_level,
    limit:  limit  ? parseInt(limit,  10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  }, req.locationScope);
  res.json({ data: result, error: null });
}

export async function getOne(req, res) {
  const pregnancy = await svc.getPregnancy(req.params.id);
  res.json({ data: pregnancy, error: null });
}

export async function createPregnancy(req, res) {
  const payload = validate(createPregnancySchema, req.body);
  const pregnancy = await svc.createPregnancy(req.params.memberId, payload, req.profile.id);
  res.status(201).json({ data: pregnancy, error: null });
}

export async function update(req, res) {
  const payload = validate(updatePregnancySchema, req.body);
  const pregnancy = await svc.updatePregnancy(req.params.id, payload, req.profile.id);
  res.json({ data: pregnancy, error: null });
}

export async function listCheckups(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listCheckups(req.params.id, { limit, offset });
  res.json({ data: result, error: null });
}

export async function createCheckup(req, res) {
  const payload = validate(createCheckupSchema, req.body);
  const checkup = await svc.createCheckup(req.params.id, payload, req.profile.id);
  res.status(201).json({ data: checkup, error: null });
}

export async function deliver(req, res) {
  const payload = validate(deliverSchema, req.body);
  const result = await svc.registerDelivery(req.params.id, payload, req.profile.id);
  res.status(201).json({ data: result, error: null });
}
