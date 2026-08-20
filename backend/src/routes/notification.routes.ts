import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));

export default router;