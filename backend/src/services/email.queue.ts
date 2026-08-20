import { EmailJobPayload } from '../types/job';
import { emailService } from './external/EmailService';

export const processEmailJob = async (payload: EmailJobPayload) => {
  const result = await emailService.send({
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
  });

  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }

  return result.data;
};