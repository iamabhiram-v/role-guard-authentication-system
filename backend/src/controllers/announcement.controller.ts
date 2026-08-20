import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { announcementService } from '../services/announcement.service';
import { ForbiddenError, BadRequestError } from '../utils/errors';

class AnnouncementController {
  async createBroadcast(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        throw new ForbiddenError('Only admins can send broadcast announcements');
      }

      const { title, message } = req.body;
      if (!title || !message) {
        throw new BadRequestError('title and message are required');
      }

      const announcement = await announcementService.createBroadcast(req.user!.userId, title, message);
      res.status(201).json({ status: 'success', data: announcement });
    } catch (err) {
      next(err);
    }
  }

  async getActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await announcementService.getActiveAnnouncement(req.user!.userId);
      res.status(200).json({ status: 'success', data: announcement });
    } catch (err) {
      next(err);
    }
  }

  async dismiss(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await announcementService.dismissAnnouncement(id, req.user!.userId);
      res.status(200).json({ status: 'success', message: 'Dismissed' });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        throw new ForbiddenError('Only admins can deactivate announcements');
      }
      const { id } = req.params;
      await announcementService.deactivateAnnouncement(id);
      res.status(200).json({ status: 'success', message: 'Announcement deactivated' });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        throw new ForbiddenError('Only admins can view announcement history');
      }
      const announcements = await announcementService.listAnnouncements();
      res.status(200).json({ status: 'success', data: announcements });
    } catch (err) {
      next(err);
    }
  }
}

export const announcementController = new AnnouncementController();