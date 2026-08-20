import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { serviceStatusController } from '../controllers/serviceStatus.controller';

const router = Router();
router.use(authMiddleware);
router.get('/', serviceStatusController.getAll);

export default router;