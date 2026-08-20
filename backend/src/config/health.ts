import { Router, Request, Response } from 'express';
import { db } from './database';
import { redisConnection } from './redis';

const router = Router();

// Liveness — "is the process alive at all?" Should almost never fail;
// a container orchestrator restarts the container if this fails, so it
// deliberately checks nothing external (a slow DB shouldn't trigger a
// restart loop of an otherwise-healthy process).
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness — "can this instance actually serve traffic right now?"
// Checks real dependencies. A load balancer/orchestrator uses this to
// decide whether to route requests here — failing this takes the
// instance out of rotation without killing/restarting it.
router.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {};
  let allOk = true;

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    allOk = false;
  }

  try {
    const pong = await redisConnection.ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'error';
    if (pong !== 'PONG') allOk = false;
  } catch {
    checks.redis = 'error';
    allOk = false;
  }

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;