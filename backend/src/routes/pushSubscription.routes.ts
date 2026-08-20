import { Router } from 'express';
import { pushSubscriptionController } from '../controllers/pushSubscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/status', pushSubscriptionController.getStatus.bind(pushSubscriptionController));
router.post('/subscribe', pushSubscriptionController.subscribe.bind(pushSubscriptionController));
router.post('/unsubscribe', pushSubscriptionController.unsubscribe.bind(pushSubscriptionController));

export default router;