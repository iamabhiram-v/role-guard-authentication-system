import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { pushSubscriptionService } from '../services/pushSubscription.service';
import { BadRequestError } from '../utils/errors';

class PushSubscriptionController {
  async subscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new BadRequestError('endpoint and keys.p256dh / keys.auth are required');
      }
      const sub = await pushSubscriptionService.subscribe(req.user!.userId, { endpoint, keys });
      res.status(201).json({ status: 'success', data: sub });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        throw new BadRequestError('endpoint is required');
      }
      const removed = await pushSubscriptionService.unsubscribe(req.user!.userId, endpoint);
      res.status(200).json({ status: 'success', data: { removed } });
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isSubscribed = await pushSubscriptionService.isSubscribed(req.user!.userId);
      const subscriptions = await pushSubscriptionService.getSubscriptions(req.user!.userId);
      res.status(200).json({ status: 'success', data: { isSubscribed, subscriptions } });
    } catch (err) {
      next(err);
    }
  }
}

export const pushSubscriptionController = new PushSubscriptionController();