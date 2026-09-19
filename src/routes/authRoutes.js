import { Router } from 'express';
import { registerBusiness, login, me, refresh } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/register', registerBusiness);
router.post('/login', login);
router.post('/refresh-token', refresh);
router.get('/me', requireAuth, me);

export default router;
