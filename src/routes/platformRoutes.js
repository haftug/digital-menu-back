import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { listBusinesses, updateBusinessStatus, platformStats } from '../controllers/platformController.js';

const router = Router();

router.use(requireAuth, requireRole('super_admin'));

router.get('/stats', platformStats);
router.get('/businesses', listBusinesses);
router.patch('/businesses/:id/status', updateBusinessStatus);

export default router;
