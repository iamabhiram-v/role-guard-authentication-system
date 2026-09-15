import { EmailJobPayload } from '../types/job';
import { emailService } from './external/EmailService';

export const processEmailJob = async (payload: EmailJobPayload & { html?: string }): Promise<void> => {
  const result = await emailService.send({
    to: payload.to,
    subject: payload.subject,
    // Some callers (e.g. workspace invite emails) send "html" instead of "body" — support both.
    body: payload.body ?? payload.html,
  });

  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }
};