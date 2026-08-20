import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ExternalService } from './external/baseService';
import { ServiceError } from './external/errors';
import { ServiceCallResult } from './external/types';

interface CreateOrderInput {
  amountInPaise: number; // Razorpay expects the smallest currency unit
  currency?: string;     // default INR
  receipt: string;       // your internal order/reference id
  notes?: Record<string, string>;
}

interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Razorpay SDK errors carry a statusCode. 429/5xx/network = retryable,
// 4xx (bad request, auth, validation) = permanent.
function isRetryableRazorpayError(err: unknown): boolean {
  const status = (err as any)?.statusCode ?? (err as any)?.error?.statusCode;
  if (typeof status === 'number') {
    return status === 429 || status >= 500;
  }
  return true; // unknown shape (e.g. network error) — assume transient
}

class RazorpayService extends ExternalService {
  protected readonly serviceName = 'razorpay';
  private client: Razorpay | null = null;

  async init(): Promise<void> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn(`[razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment routes will return 503`);
      return;
    }

    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  isReady(): boolean {
    return this.client !== null;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.execute(
      () => this.client!.orders.all({ count: 1 }),
      { maxAttempts: 1 }
    );
    return result.success;
  }

  async createOrder(input: CreateOrderInput): Promise<ServiceCallResult<any>> {
    if (!this.client) {
      throw ServiceError.permanent(`[${this.serviceName}] Service not initialized`);
    }

    return this.execute(
      async () => {
        try {
          return await this.client!.orders.create({
            amount: input.amountInPaise,
            currency: input.currency ?? 'INR',
            receipt: input.receipt,
            notes: input.notes,
          });
        } catch (err) {
          const providerCode = (err as any)?.error?.code;
          throw isRetryableRazorpayError(err)
            ? ServiceError.retryable(errMsg(err), providerCode)
            : ServiceError.permanent(errMsg(err), providerCode);
        }
      },
      { maxAttempts: 3 }
    );
  }

  /** Fetches order details from Razorpay directly — used to get the
   *  authoritative amount for the confirmation email rather than trusting
   *  whatever the frontend might send. */
  async fetchOrder(orderId: string): Promise<ServiceCallResult<any>> {
    if (!this.client) {
      throw ServiceError.permanent(`[${this.serviceName}] Service not initialized`);
    }

    return this.execute(
      async () => {
        try {
          return await this.client!.orders.fetch(orderId);
        } catch (err) {
          const providerCode = (err as any)?.error?.code;
          throw isRetryableRazorpayError(err)
            ? ServiceError.retryable(errMsg(err), providerCode)
            : ServiceError.permanent(errMsg(err), providerCode);
        }
      },
      { maxAttempts: 2 }
    );
  }

  /** Verifies the signature Razorpay sends back after checkout completes client-side. */
  verifyPaymentSignature(input: VerifyPaymentInput): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw ServiceError.permanent(`[${this.serviceName}] Missing RAZORPAY_KEY_SECRET`);
    }

    const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    return expectedSignature === input.razorpay_signature;
  }

  /** Verifies webhook signature (different secret from the checkout signature above). */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw ServiceError.permanent(`[${this.serviceName}] Missing RAZORPAY_WEBHOOK_SECRET`);
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return expected === signature;
  }
}

export const razorpayService = new RazorpayService();