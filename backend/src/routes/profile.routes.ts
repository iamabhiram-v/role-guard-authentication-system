import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from '../validations/profile.validation';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', profileController.getProfile.bind(profileController));

router.put('/', validate(updateProfileSchema), profileController.updateProfile.bind(profileController));

router.put(
  '/password',
  rateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }),
  validate(changePasswordSchema),
  profileController.changePassword.bind(profileController)
);

router.patch('/2fa', profileController.toggle2FA.bind(profileController));

router.delete(
  '/',
  rateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  validate(deleteAccountSchema),
  profileController.deleteAccount.bind(profileController)
);

export default router;