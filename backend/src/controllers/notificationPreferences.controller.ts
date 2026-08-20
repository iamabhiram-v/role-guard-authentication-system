import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationPreferencesService } from '../services/notificationPreferences.service';

class NotificationPreferencesController {
  async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const prefs = await notificationPreferencesService.getPreferences(req.user!.userId);
      res.status(200).json({ status: 'success', data: prefs });
    } catch (err) {
      next(err);
    }
  }

  async updatePreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category } = req.params;
      const { email_enabled, in_app_enabled } = req.body;

      if (email_enabled === undefined && in_app_enabled === undefined) {
        res.status(400).json({ status: 'error', message: 'Provide email_enabled and/or in_app_enabled' });
        return;
      }

      const updated = await notificationPreferencesService.updatePreference(req.user!.userId, category, {
        email_enabled,
        in_app_enabled,
      });
      res.status(200).json({ status: 'success', data: updated });
    } catch (err: any) {
      if (err.message?.startsWith('Unknown notification category')) {
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }
      next(err);
    }
  }
}

export const notificationPreferencesController = new NotificationPreferencesController();