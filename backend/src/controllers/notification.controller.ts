import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { db } from '../config/database';

class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { filter, page } = req.query; 
      const limit = 15;
      const currentPage = page ? Math.max(1, Number(page)) : 1;
      const offset = (currentPage - 1) * limit;

      const whereClause =
        filter === 'unread' ? `WHERE user_id = $1 AND is_read = false` : `WHERE user_id = $1`;

      const countResult = await db.query(
        `SELECT COUNT(*)::int AS total FROM notifications ${whereClause}`,
        [userId]
      );
      const total = countResult.rows[0]?.total || 0;

      const result = await db.query(
        `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      res.status(200).json({
        status: 'success',
        data: result.rows,
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

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await db.query(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      res.status(200).json({ status: 'success', data: { count: result.rows[0].count } });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await db.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await db.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();