import IORedis from 'ioredis';

// TLS is opt-in via REDIS_TLS=true so local/Docker/CI Redis (no TLS) keeps
// working unchanged. Managed providers that require TLS on the standard
// Redis protocol (e.g. Upstash) need this set in their environment.
const useTls = process.env.REDIS_TLS === 'true';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  ...(useTls ? { tls: {} } : {}),
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});