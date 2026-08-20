import nodemailer, { Transporter } from 'nodemailer';
import { ExternalService } from './baseService';
import { ServiceError } from './errors';
import { ServiceCallResult } from './types';

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export class EmailService extends ExternalService {
  protected readonly serviceName = 'email';
  private transporter: Transporter;

  constructor() {
    super();
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        console.error('❌ SMTP transporter verification failed:', error);
      } else {
        console.log('✅ SMTP transporter ready');
      }
    });
  }

  async send(input: SendEmailInput): Promise<ServiceCallResult<{ messageId: string }>> {
    return this.execute(
      async () => {
        console.log('📤 Attempting to send email:', {
          to: input.to,
          subject: input.subject,
          smtpHost: process.env.SMTP_HOST,
          smtpUser: process.env.SMTP_USER,
          hasSmtpPass: !!process.env.SMTP_PASS,
        });

        try {
          const info = await this.transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@roleguard.com',
            to: input.to,
            subject: input.subject,
            html: input.body,
          });

          console.log(
            `📧 Email sent — messageId: ${info.messageId}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`
          );

          return { messageId: info.messageId };
        } catch (err: any) {
          console.error('❌ SMTP send failed:', err);
          const permanentCodes = ['EAUTH', 'EENVELOPE'];
          if (permanentCodes.includes(err.code)) {
            throw ServiceError.permanent(err.message, err.code);
          }
          throw ServiceError.retryable(err.message, err.code);
        }
      },
      { maxAttempts: 3, baseDelayMs: 800 }
    );
  }
}

export const emailService = new EmailService();