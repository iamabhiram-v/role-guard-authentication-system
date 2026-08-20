import { withRetry } from './retry';
import { serviceRegistry } from './serviceRegistry';
import { RetryOptions, ServiceCallResult } from './types';


export abstract class ExternalService {
  protected abstract readonly serviceName: string;

  constructor() {

  }

  protected async execute<T>(fn: () => Promise<T>, retryOptions?: RetryOptions): Promise<ServiceCallResult<T>> {
    serviceRegistry.register(this.serviceName);
    let attempts = 0;

    try {
      const data = await withRetry(async () => {
        attempts += 1;
        return fn();
      }, retryOptions);

      serviceRegistry.recordSuccess(this.serviceName);
      return { success: true, data, attempts };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      serviceRegistry.recordFailure(this.serviceName, message);
      return { success: false, error: message, attempts };
    }
  }
}