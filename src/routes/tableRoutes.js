import { Router } from 'express';
import { requireAuth, requireRole, requireBusinessContext } from '../middlewares/auth.js';
import { listTables, createTable, updateTable, deleteTable } from '../controllers/tableController.js';

const router = Router();

router.use(requireAuth, requireRole('business_owner', 'staff'), requireBusinessContext);

router.get('/', listTables);
router.post('/', createTable);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);

export default router;
