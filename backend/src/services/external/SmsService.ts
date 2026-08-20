import twilio, { Twilio } from 'twilio';
import { ExternalService } from './baseService';
import { ServiceError } from './errors';
import { ServiceCallResult } from './types';

export interface SendSmsInput {
  to: string;
  message: string;
}

export class SmsService extends ExternalService {
  protected readonly serviceName = 'sms';
  private client: Twilio;
  private fromNumber: string;

  constructor() {
    super();
    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
    this.client = twilio(accountSid, authToken);
  }

  async send(input: SendSmsInput): Promise<ServiceCallResult<{ sid: string }>> {
    return this.execute(
      async () => {
        try {
          const result = await this.client.messages.create({
            to: input.to,
            from: this.fromNumber,
            body: input.message,
          });
          return { sid: result.sid };
        } catch (err: any) {
          const permanentCodes = [21211, 21608, 20003, 21610];
          if (permanentCodes.includes(err.code)) {
            throw ServiceError.permanent(err.message, String(err.code));
          }
          throw ServiceError.retryable(err.message, String(err.code));
        }
      },
      { maxAttempts: 3, baseDelayMs: 700 }
    );
  }
}

export const smsService = new SmsService();