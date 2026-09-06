import { Router, Request, Response } from 'express';
import { db } from './database';
import { redisConnection } from './redis';

const router = Router();

/**
 * Liveness check
 *
 * Checks only whether the Node.js process is alive.
 * It does NOT check PostgreSQL or Redis.
 *
 * Because this router is mounted at /health in index.ts,
 * this endpoint becomes:
 *
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness check
 *
 * Checks whether the application can actually serve traffic.
 * It verifies:
 *   1. PostgreSQL
 *   2. Redis
 *
 * Because this router is mounted at /health in index.ts,
 * this endpoint becomes:
 *
 * GET /health/ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {};
  let allOk = true;

  // PostgreSQL health check
  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    allOk = false;

    console.error('Health check - Database unavailable:', error);
  }

  // Redis health check
  try {
    const pong = await redisConnection.ping();

    if (pong === 'PONG') {
      checks.redis = 'ok';
    } else {
      checks.redis = 'error';
      allOk = false;

      console.error(
        `Health check - unexpected Redis response: ${pong}`
      );
    }
  } catch (error) {
    checks.redis = 'error';
    allOk = false;

    console.error('Health check - Redis unavailable:', error);
  }

  // Return 200 when everything is healthy.
  // Return 503 when any dependency is unavailable.
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;