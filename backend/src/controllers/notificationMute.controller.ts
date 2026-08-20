import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationPreferencesService } from '../services/notificationPreferences.service';

export class NotificationMuteController {
  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const muted = await notificationPreferencesService.isMasterMuted(req.user!.userId);
      res.status(200).json({ status: 'success', data: { muted } });
    } catch (err) {
      next(err);
    }
  }

  async setStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { muted } = req.body as { muted: boolean };
      await notificationPreferencesService.setMasterMute(req.user!.userId, muted);
      res.status(200).json({ status: 'success', data: { muted } });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationMuteController = new NotificationMuteController();