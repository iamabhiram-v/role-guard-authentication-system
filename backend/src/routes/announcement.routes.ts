import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/active', announcementController.getActive.bind(announcementController));
router.post('/:id/dismiss', announcementController.dismiss.bind(announcementController));
router.get('/', announcementController.list.bind(announcementController));
router.post('/', announcementController.createBroadcast.bind(announcementController));
router.patch('/:id/deactivate', announcementController.deactivate.bind(announcementController));

export default router;