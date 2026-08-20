import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);

router.get('/overview', dashboardController.getOverview);
router.get('/timeline', dashboardController.getTimeline);
router.get('/top-workspaces', dashboardController.getTopWorkspaces);
router.get('/summary', dashboardController.getSummary);
router.get('/export', dashboardController.exportCsv);
router.get('/export/json', dashboardController.exportJson);
router.get('/export/pdf', dashboardController.exportPdf);

export default router;