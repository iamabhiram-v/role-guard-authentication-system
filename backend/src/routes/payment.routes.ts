import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

router.use(authMiddleware);

router.post('/orders', (req, res, next) => paymentController.createOrder(req, res, next));
router.post('/verify', (req, res, next) => paymentController.verifyPayment(req, res, next));

// Webhook is unauthenticated — Razorpay posts here directly.
// Body is captured as raw text so HMAC can be verified before parsing.
router.post(
  '/webhook',
  (req: Request, res: Response, next: NextFunction) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  },
  (req, res, next) => paymentController.webhook(req, res, next)
);

export default router;
