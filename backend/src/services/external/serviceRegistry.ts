import { ServiceHealth, ServiceHealthStatus } from './types';

class ServiceRegistry {
  private services = new Map<string, ServiceHealth>();

  register(name: string) {
    if (!this.services.has(name)) {
      this.services.set(name, {
        name,
        status: 'unknown',
        lastCheckedAt: new Date().toISOString(),
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        consecutiveFailures: 0,
      });
    }
  }

  recordSuccess(name: string) {
    this.register(name);
    const entry = this.services.get(name)!;
    entry.status = 'healthy';
    entry.lastCheckedAt = new Date().toISOString();
    entry.lastSuccessAt = entry.lastCheckedAt;
    entry.consecutiveFailures = 0;
  }

  recordFailure(name: string, errorMessage: string) {
    this.register(name);
    const entry = this.services.get(name)!;
    entry.consecutiveFailures += 1;
    entry.lastCheckedAt = new Date().toISOString();
    entry.lastErrorAt = entry.lastCheckedAt;
    entry.lastErrorMessage = errorMessage;
    
    entry.status = entry.consecutiveFailures >= 3 ? 'down' : 'degraded';
  }

  getAll(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  get(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }
}

export const serviceRegistry = new ServiceRegistry();