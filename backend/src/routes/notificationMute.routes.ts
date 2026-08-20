import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { notificationMuteController } from '../controllers/notificationMute.controller';

const router = Router();
router.use(authMiddleware);
router.get('/', notificationMuteController.getStatus);
router.put('/', notificationMuteController.setStatus);

export default router;