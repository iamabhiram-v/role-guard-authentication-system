import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { profileService } from '../services/profile.service';
import { validateEmailDomain } from '../validations/profile.validation';
import { queueService } from '../services/queue.service';
import { notificationPreferencesService } from '../services/notificationPreferences.service';

export class ProfileController {
  async toggle2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ status: 'error', message: '`enabled` must be a boolean' });
        return;
      }
      const profile = await profileService.toggle2FA(userId, enabled);
      res.status(200).json({
        status: 'success',
        message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await profileService.getProfile(userId);
      res.status(200).json({ status: 'success', message: 'Profile retrieved', data: profile });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      if (req.body.email) {
        const domainError = await validateEmailDomain(req.body.email);
        if (domainError) {
          res.status(400).json({
            status: 'error',
            message: domainError,
          });
          return;
        }
      }

      // Capture the email BEFORE the update, in case the update itself
      // changes it — the security alert should go to the account's
      // original inbox, not a new email an attacker just set.
      const before = await profileService.getProfile(userId);
      const notifyEmail = before.email;

      const updated = await profileService.updateProfile(userId, req.body);

      if (notifyEmail) {
        try {
          const emailAllowed = await notificationPreferencesService.isChannelEnabled(userId, 'general', 'email');
          if (emailAllowed) {
            await queueService.enqueue('email', {
              to: notifyEmail,
              subject: 'Your RoleGuard profile was updated',
              body: `<p>Hi,</p><p>Your profile information was just updated. If this wasn't you, please secure your account immediately by changing your password.</p>`,
            });
          }
        } catch (notifyErr) {
          console.error('Failed to queue profile update notification:', notifyErr);
        }
      }

      res.status(200).json({ status: 'success', message: 'Profile updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const profile = await profileService.getProfile(userId);

      const result = await profileService.changePassword(userId, req.body);

      if (profile.email) {
        try {
          const emailAllowed = await notificationPreferencesService.isChannelEnabled(userId, 'general', 'email');
          if (emailAllowed) {
            await queueService.enqueue('email', {
              to: profile.email,
              subject: 'Your RoleGuard password was changed',
              body: `<p>Hi,</p><p>Your account password was just changed. If you did not make this change, please contact support immediately.</p>`,
            });
          }
        } catch (notifyErr) {
          console.error('Failed to queue password change notification:', notifyErr);
        }
      }

      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;
      const result = await profileService.deleteAccount(userId, password);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }
}

export const profileController = new ProfileController();