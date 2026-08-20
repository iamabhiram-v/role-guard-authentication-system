import { Router } from 'express';
import { notificationPreferencesController } from '../controllers/notificationPreferences.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationPreferencesController.getPreferences.bind(notificationPreferencesController));
router.patch('/:category', notificationPreferencesController.updatePreference.bind(notificationPreferencesController));

export default router;