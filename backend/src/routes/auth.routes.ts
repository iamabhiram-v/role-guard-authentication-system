import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => `login:${req.ip || 'unknown'}`,
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyGenerator: (req) => `register:${req.ip || 'unknown'}`,
});

const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 8, 
  keyGenerator: (req) => `otp:${req.ip || 'unknown'}`,
});

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/verify-otp', otpLimiter, authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;