import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { razorpayService } from '../services/razorpay.service';
import { queueService } from '../services/queue.service';
import { z } from 'zod';

const createOrderSchema = z.object({
  amountInPaise: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  receipt: z.string().min(1).max(40),
  notes: z.record(z.string()).optional(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export class PaymentController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createOrderSchema.parse(req.body);

      if (!razorpayService.isReady()) {
        await razorpayService.init();
      }

      if (!razorpayService.isReady()) {
        res.status(503).json({ status: 'error', message: 'Payment service not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET' });
        return;
      }

      const result = await razorpayService.createOrder(body);

      if (!result.success) {
        res.status(502).json({ status: 'error', message: result.error || 'Failed to create order' });
        return;
      }

      res.status(201).json({ status: 'success', data: result.data });
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = verifySchema.parse(req.body);
      const isValid = razorpayService.verifyPaymentSignature(body);

      if (!isValid) {
        res.status(400).json({ status: 'error', message: 'Invalid payment signature' });
        return;
      }

      res.status(200).json({ status: 'success', data: { verified: true, paymentId: body.razorpay_payment_id } });

      // Confirmation email is fire-and-forget after the response — the
      // user shouldn't wait on it, and a failure here shouldn't affect
      // the already-successful payment response above. Goes through the
      // same job queue as OTP/invite emails, so it's visible/retryable
      // in Queue Monitor rather than a bare unqueued send.
      try {
        const orderResult = await razorpayService.fetchOrder(body.razorpay_order_id);
        const amountInPaise = orderResult.success ? orderResult.data?.amount : null;
        const currency = orderResult.success ? orderResult.data?.currency : 'INR';
        const amountDisplay = typeof amountInPaise === 'number' ? (amountInPaise / 100).toFixed(2) : null;

        await queueService.enqueue(
          'email',
          {
            to: req.user!.email,
            subject: 'Payment received — RoleGuard',
            body: `
              <div style="font-family: sans-serif;">
                <h2>Payment confirmed</h2>
                <p>Hi,</p>
                <p>We've received your payment${amountDisplay ? ` of <strong>${currency} ${amountDisplay}</strong>` : ''}.</p>
                <p style="color: #666; font-size: 0.85rem;">Payment ID: ${body.razorpay_payment_id}</p>
                <p style="color: #666; font-size: 0.85rem;">Order ID: ${body.razorpay_order_id}</p>
                <p>This was a sandbox transaction — no real charge was made.</p>
              </div>
            `,
          },
          { createdBy: req.user!.userId }
        );
      } catch (emailErr) {
        // Already responded 200 to the client — just log, don't throw.
        console.error('[payment] Failed to enqueue confirmation email:', emailErr);
      }
    } catch (err) {
      next(err);
    }
  }

  // Webhook is unauthenticated — Razorpay posts here directly.
  // rawBody is captured in the route middleware before express.json() parses it.
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'];
      if (typeof signature !== 'string') {
        res.status(400).json({ status: 'error', message: 'Missing webhook signature' });
        return;
      }

      const rawBody = (req as any).rawBody as string | undefined;
      if (!rawBody) {
        res.status(400).json({ status: 'error', message: 'Missing raw body' });
        return;
      }

      const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
        return;
      }

      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();