import { RetryOptions } from './types';
import { ServiceError } from './errors';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = capped * (0.5 + Math.random() * 0.5); 
  return Math.round(jitter);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isRetryable = err instanceof ServiceError ? err.retryable : true;
      const isLastAttempt = attempt === maxAttempts;

      if (!isRetryable || isLastAttempt) {
        throw err;
      }

      options.onRetry?.(attempt, err);
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError;
}