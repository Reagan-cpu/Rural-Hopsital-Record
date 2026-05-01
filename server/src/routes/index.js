import { Router } from 'express';
import profilesRouter from './profiles.js';
import householdsRouter from './households.js';
import membersRouter from './members.js';
import visitsRouter from './visits.js';
import diseaseHistoryRouter from './diseaseHistory.js';
import pregnanciesRouter from './pregnancies.js';
import vaccinationsRouter from './vaccinations.js';
import auditLogsRouter from './auditLogs.js';
import notificationsRouter from './notifications.js';
import locationsRouter from './locations.js';
import searchRouter from './search.js';
import adminRouter from './admin.js';
import reportsRouter from './reports.js';
import fieldVisitsRouter from './fieldVisits.js';

const router = Router();

router.use('/profiles', profilesRouter);
router.use('/households', householdsRouter);
router.use('/members', membersRouter);
router.use('/visits', visitsRouter);
router.use('/disease-history', diseaseHistoryRouter);
router.use('/pregnancies', pregnanciesRouter);
router.use('/vaccinations', vaccinationsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/notifications', notificationsRouter);
router.use('/locations', locationsRouter);
router.use('/search', searchRouter);
router.use('/admin', adminRouter);
router.use('/reports', reportsRouter);
router.use('/field-visits', fieldVisitsRouter);

export default router;
