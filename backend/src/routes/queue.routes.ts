import { Router } from 'express';
import { queueController } from '../controllers/queue.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/jobs', queueController.getJobs.bind(queueController));
router.get('/stats', queueController.getStats.bind(queueController));
router.get('/throughput', queueController.getThroughput.bind(queueController));
router.get('/health', queueController.getHealth.bind(queueController));
router.get('/latency', queueController.getLatencyStats.bind(queueController));
router.post('/jobs', queueController.createJob.bind(queueController));
router.post('/jobs/:id/retry', queueController.retryJob.bind(queueController));
router.post('/jobs/:id/hold', queueController.holdJob.bind(queueController));
router.post('/jobs/:id/release', queueController.releaseJob.bind(queueController));
router.post('/pause', queueController.pauseQueue.bind(queueController));
router.post('/resume', queueController.resumeQueue.bind(queueController));
router.post('/jobs/:id/hold', queueController.holdJob.bind(queueController));
router.post('/jobs/:id/release', queueController.releaseJob.bind(queueController));

export default router;