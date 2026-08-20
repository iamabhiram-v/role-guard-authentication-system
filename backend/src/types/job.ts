export type JobType = 'email' | 'notification' | 'sms';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  error: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailJobPayload {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationJobPayload {
  userId: string;
  title: string;
  message: string;
}

export interface SmsJobPayload {
  to: string;
  message: string;
}