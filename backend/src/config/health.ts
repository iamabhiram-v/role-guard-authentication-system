import { Router, Request, Response } from 'express';
import { db } from './database';
import { redisConnection } from './redis';

const router = Router();


router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    commit: process.env.GIT_SHA || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {};
  let allOk = true;

  
  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    allOk = false;

    console.error('Health check - Database unavailable:', error);
  }

  
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

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;