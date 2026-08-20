import IORedis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null on the connection it's given —
// without this, ioredis's own retry logic fights with BullMQ's blocking
// commands and connections silently misbehave.
export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});