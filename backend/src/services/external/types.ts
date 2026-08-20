export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface ServiceCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}