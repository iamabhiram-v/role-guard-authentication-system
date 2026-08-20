import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { queueService } from '../services/queue.service';
import { pauseQueue as pauseWorkerQueue, resumeQueue as resumeWorkerQueue, getQueueControlStatus } from '../services/worker.service';
import { ForbiddenError } from '../utils/errors';

const PRIVILEGED_ROLES = ['admin', 'manager'];

export class QueueController {
  async getJobs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, type, page } = req.query;
      const limit = 10;
      const currentPage = page ? Math.max(1, Number(page)) : 1;
      const offset = (currentPage - 1) * limit;

      const { jobs, total } = await queueService.getJobs({
        status: status as string,
        type: type as string,
        limit,
        offset,
      });

      res.status(200).json({
        status: 'success',
        data: jobs,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await queueService.getStats();
      res.status(200).json({ status: 'success', data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getThroughput(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await queueService.getThroughput();
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async getHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const status = await getQueueControlStatus();
      res.status(200).json({
        status: 'success',
        data: {
          lastPollAt: status.last_poll_at,
          isPaused: status.is_paused,
          pausedBy: status.paused_by,
          pausedAt: status.paused_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async pauseQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
        throw new ForbiddenError('Only admins or managers can pause the queue');
      }
      await pauseWorkerQueue(req.user!.userId);
      res.status(200).json({ status: 'success', message: 'Queue paused' });
    } catch (err) {
      next(err);
    }
  }

  async resumeQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
        throw new ForbiddenError('Only admins or managers can resume the queue');
      }
      await resumeWorkerQueue();
      res.status(200).json({ status: 'success', message: 'Queue resumed' });
    } catch (err) {
      next(err);
    }
  }

  async getLatencyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await queueService.getLatencyStats();
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async retryJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
        throw new ForbiddenError('Only admins or managers can retry jobs');
      }

      const { id } = req.params;
      const job = await queueService.retryJob(id);
      if (!job) {
        res.status(404).json({ status: 'error', message: 'Job not found or not in failed state' });
        return;
      }
      res.status(200).json({ status: 'success', message: 'Job re-queued', data: job });
    } catch (err) {
      next(err);
    }
  }

  async holdJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
        throw new ForbiddenError('Only admins or managers can hold jobs');
      }

      const { id } = req.params;
      const job = await queueService.holdJob(id);
      if (!job) {
        res.status(404).json({ status: 'error', message: 'Job not found or not in pending state' });
        return;
      }
      res.status(200).json({ status: 'success', message: 'Job held', data: job });
    } catch (err) {
      next(err);
    }
  }

  async releaseJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
        throw new ForbiddenError('Only admins or managers can release jobs');
      }

      const { id } = req.params;
      const job = await queueService.releaseJob(id);
      if (!job) {
        res.status(404).json({ status: 'error', message: 'Job not found or not in pending state' });
        return;
      }
      res.status(200).json({ status: 'success', message: 'Job released', data: job });
    } catch (err) {
      next(err);
    }
  }

  async createJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, payload } = req.body;

      if (type !== 'email' && type !== 'notification') {
        res.status(400).json({ status: 'error', message: "type must be 'email' or 'notification'" });
        return;
      }

      if (type === 'email') {
        const { to, subject, body } = payload || {};
        if (!to || !subject || !body) {
          res.status(400).json({ status: 'error', message: 'Email jobs require to, subject, and body' });
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
          res.status(400).json({ status: 'error', message: 'to must be a valid email address' });
          return;
        }
      }

      if (type === 'notification') {
        const { userId, title, message } = payload || {};
        if (!userId || !title || !message) {
          res.status(400).json({ status: 'error', message: 'Notification jobs require userId, title, and message' });
          return;
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          res.status(400).json({ status: 'error', message: 'userId must be a valid UUID' });
          return;
        }
      }

      const job = await queueService.enqueue(type, payload, { createdBy: req.user!.userId });
      res.status(201).json({ status: 'success', data: job });
    } catch (err) {
      next(err);
    }
  }
}

export const queueController = new QueueController();