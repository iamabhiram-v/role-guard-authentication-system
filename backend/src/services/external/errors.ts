
export class ServiceError extends Error {
  public readonly retryable: boolean;
  public readonly providerCode?: string;

  constructor(message: string, options: { retryable: boolean; providerCode?: string; cause?: unknown }) {
    super(message);
    this.name = 'ServiceError';
    this.retryable = options.retryable;
    this.providerCode = options.providerCode;
    if (options.cause) {
      (this as any).cause = options.cause;
    }
  }

  static retryable(message: string, providerCode?: string) {
    return new ServiceError(message, { retryable: true, providerCode });
  }

  static permanent(message: string, providerCode?: string) {
    return new ServiceError(message, { retryable: false, providerCode });
  }
}