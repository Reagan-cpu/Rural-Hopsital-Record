import * as svc from '../services/fieldVisits.js';
import { z } from 'zod';
import { validate } from '../lib/validate.js';

const baseSchema = z.object({
  village_id:         z.string().uuid().optional(),
  village_name:       z.string().min(1).max(200).optional(),
  district_id:        z.string().uuid().optional(),
  visited_at:         z.string().datetime().optional(),
  households_updated: z.number().int().min(0).default(0),
  members_added:      z.number().int().min(0).default(0),
  notes:              z.string().max(1000).optional(),
});

const createSchema = baseSchema.superRefine((data, ctx) => {
  if (!data.village_id && !data.village_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'village_id or village_name is required',
      path: ['village_id'],
    });
  }
  if (data.village_name && !data.district_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'district_id is required when village_name is provided',
      path: ['district_id'],
    });
  }
});

const updateSchema = baseSchema.partial().omit({ village_id: true });

export async function listFieldVisits(req, res) {
  const { village_id, staff_id, limit, offset } = req.query;
  const data = await svc.listFieldVisits({
    villageId: village_id,
    staffId:   staff_id,
    limit:     limit  ? parseInt(limit,  10) : 50,
    offset:    offset ? parseInt(offset, 10) : 0,
  });
  res.json({ data, error: null });
}

export async function createFieldVisit(req, res) {
  const payload = validate(createSchema, req.body);
  const data = await svc.createFieldVisit(payload, req.profile.id);
  res.status(201).json({ data, error: null });
}

export async function updateFieldVisit(req, res) {
  const payload = validate(updateSchema, req.body);
  const data = await svc.updateFieldVisit(req.params.id, payload, req.profile.id);
  res.json({ data, error: null });
}

export async function getUnvisitedVillages(req, res) {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  const data = await svc.getUnvisitedVillages(days);
  res.json({ data, error: null });
}
