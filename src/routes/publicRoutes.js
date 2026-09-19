import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getBusinessBySlug,
  getPublicMenu,
  getPublicServices,
  recordScan,
  createOrder,
  getOrderStatus,
  createServiceRequest
} from '../controllers/publicController.js';

const router = Router();

// Public write endpoints get a stricter limiter than read endpoints.
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

router.get('/business/:slug', readLimiter, getBusinessBySlug);
router.get('/business/:slug/menu', readLimiter, getPublicMenu);
router.get('/business/:slug/services', readLimiter, getPublicServices);
router.post('/business/:slug/scan', writeLimiter, recordScan);
router.post('/business/:slug/orders', writeLimiter, createOrder);
router.get('/business/:slug/orders/:orderId', readLimiter, getOrderStatus);
router.post('/business/:slug/service-requests', writeLimiter, createServiceRequest);

export default router;
