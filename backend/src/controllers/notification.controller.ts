import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';

class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { filter, page } = req.query;

      const { notifications, pagination } = await notificationService.getNotifications({
        userId,
        filter: filter as string | undefined,
        page: page ? Number(page) : undefined,
      });

      res.status(200).json({
        status: 'success',
        data: notifications,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.status(200).json({ status: 'success', data: { count } });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await notificationService.markAsRead(userId, id);
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await notificationService.markAllAsRead(userId);
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();