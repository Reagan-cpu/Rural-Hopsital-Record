import { validate } from '../lib/validate.js';
import { z, paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/auditLogs.js';

const filterSchema = paginationSchema.extend({
  table_name: z.string().optional(),
  record_id: z.string().uuid().optional(),
  actor_id: z.string().uuid().optional(),
});

export async function list(req, res) {
  const { limit, offset, table_name, record_id, actor_id } = validate(filterSchema, req.query);
  const result = await svc.listAuditLogs({ tableName: table_name, recordId: record_id, actorId: actor_id, limit, offset });
  res.json({ data: result, error: null });
}
