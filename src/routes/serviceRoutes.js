import { Router } from 'express';
import { requireAuth, requireRole, requireBusinessContext } from '../middlewares/auth.js';
import {
  listServices,
  createService,
  updateService,
  deleteService,
  listServiceRequests,
  updateServiceRequestStatus
} from '../controllers/serviceController.js';

const router = Router();

router.use(requireAuth, requireRole('business_owner', 'staff'), requireBusinessContext);

router.get('/', listServices);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

router.get('/requests/all', listServiceRequests);
router.patch('/requests/:id/status', updateServiceRequestStatus);

export default router;
