import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { storageService } from '../services/external/StorageService';
import { profileService } from '../services/profile.service';
import { BadRequestError } from '../utils/errors';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export class UploadController {
  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) throw new BadRequestError('No file provided');
      if (!ALLOWED_TYPES.includes(file.mimetype)) throw new BadRequestError('Only JPEG, PNG, or WebP images allowed');
      if (file.size > MAX_SIZE) throw new BadRequestError('File must be under 5MB');

      const result = await storageService.upload({
        buffer: file.buffer,
        contentType: file.mimetype,
        folder: 'avatars',
      });

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const userId = req.user!.userId;
      const updated = await profileService.updateProfile(userId, { avatarUrl: result.data!.url });

      res.status(200).json({ status: 'success', data: { avatarUrl: result.data!.url, profile: updated } });
    } catch (err) {
      next(err);
    }
  }
}

export const uploadController = new UploadController();