import { Router } from 'express';
import { requireAuth, requireRole, requireBusinessContext } from '../middlewares/auth.js';
import { listQrCodes, createQrCode, getQrCodeImage, toggleQrCode, deleteQrCode } from '../controllers/qrController.js';

const router = Router();

router.use(requireAuth, requireRole('business_owner', 'staff'), requireBusinessContext);

router.get('/', listQrCodes);
router.post('/', createQrCode);
router.get('/:id/image', getQrCodeImage);
router.patch('/:id/toggle', toggleQrCode);
router.delete('/:id', deleteQrCode);

export default router;
