import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { scopeToUserLocations } from '../middleware/scopeToUserLocations.js';
import * as ctrl from '../controllers/pregnancies.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');
const doctors = requireRole('doctor', 'admin');

// Top-level list (doctor dashboard, admin overview) — scoped to user's assigned area
router.get('/', authenticate, staff, scopeToUserLocations, ctrl.listAll);

router.get('/:id', authenticate, staff, ctrl.getOne);
router.patch('/:id', authenticate, doctors, ctrl.update);
router.get('/:id/checkups', authenticate, staff, ctrl.listCheckups);
router.post('/:id/checkups', authenticate, doctors, ctrl.createCheckup);
router.post('/:id/deliver', authenticate, doctors, ctrl.deliver);

export default router;
