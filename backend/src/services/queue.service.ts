import { db } from '../config/database';
import { JobType } from '../types/job';
import { jobQueue } from '../config/bullQueue';

interface EnqueueOptions {
  maxAttempts?: number;
  delayMs?: number;
  createdBy?: string;
}

// Postgres remains the system of record for history, stats, search, and
// export — nothing on the dashboard changes shape. BullMQ/Redis replaces
// the old 5-second setInterval polling loop as the actual execution
// engine: jobs are pushed to workers instantly instead of waiting for
// the next poll tick, and BullMQ handles concurrency/locking natively
// instead of the old `FOR UPDATE SKIP LOCKED` query.
export class QueueService {
  async enqueue(type: JobType, payload: Record<string, any>, options: EnqueueOptions = {}) {
    const { maxAttempts = 3, delayMs = 0, createdBy = null } = options;
    const scheduledAt = new Date(Date.now() + delayMs);

    const result = await db.query(
      `INSERT INTO jobs (type, payload, max_attempts, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, JSON.stringify(payload), maxAttempts, scheduledAt, createdBy]
    );
    const job = result.rows[0];

    // jobId here ties the BullMQ job 1:1 to its Postgres row — the worker
    // uses this to load/update the right row. BullMQ's own `attempts`
    // handles retry counting; we still mirror status into Postgres via
    // the completed/failed listeners in worker.service.ts.
    await jobQueue.add(type, { dbJobId: job.id, payload }, {
      jobId: job.id,
      delay: delayMs,
      attempts: maxAttempts,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return job;
  }

  // Held jobs are removed from BullMQ entirely (so nothing processes
  // them) but stay 'pending' + is_held=true in Postgres. Release re-adds
  // them to BullMQ. This is a custom mechanism — BullMQ has no native
  // "hold a specific job" concept, only pause-the-whole-queue.
  async holdJob(jobId: string) {
    const result = await db.query(
      `UPDATE jobs SET is_held = true, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [jobId]
    );
    const job = result.rows[0];
    if (!job) return null;

    const bullJob = await jobQueue.getJob(jobId);
    if (bullJob) await bullJob.remove();

    return job;
  }

  async releaseJob(jobId: string) {
    const result = await db.query(
      `UPDATE jobs SET is_held = false, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [jobId]
    );
    const job = result.rows[0];
    if (!job) return null;

    await jobQueue.add(job.type, { dbJobId: job.id, payload: job.payload }, {
      jobId: job.id,
      attempts: job.max_attempts,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return job;
  }

  async markProcessing(jobId: string) {
    await db.query(
      `UPDATE jobs SET status = 'processing', started_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
  }

  async markCompleted(jobId: string) {
    await db.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
  }

  async markFailed(jobId: string, error: string, attempts: number, maxAttempts: number) {
    const willRetry = attempts < maxAttempts;
    const status = willRetry ? 'pending' : 'failed';

    await db.query(
      `UPDATE jobs SET status = $1, error = $2, attempts = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, error, attempts, jobId]
    );
  }

  // Manual retry from the dashboard — resets attempts and re-adds to
  // BullMQ with a fresh attempt budget, same as before but pushed
  // through Redis instead of just flipping status back to 'pending'
  // and waiting for the next poll.
  async retryJob(jobId: string) {
    const result = await db.query(
      `UPDATE jobs SET status = 'pending', scheduled_at = NOW(), error = NULL, attempts = 0, updated_at = NOW()
       WHERE id = $1 AND status = 'failed'
       RETURNING *`,
      [jobId]
    );
    const job = result.rows[0];
    if (!job) return null;

    const existing = await jobQueue.getJob(jobId);
    if (existing) await existing.remove();

    await jobQueue.add(job.type, { dbJobId: job.id, payload: job.payload }, {
      jobId: job.id,
      attempts: job.max_attempts,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return job;
  }

  async getJobs(filters: { status?: string; type?: string; limit?: number; offset?: number }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.type) {
      conditions.push(`type = $${idx++}`);
      values.push(filters.type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM jobs ${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const result = await db.query(
      `SELECT * FROM jobs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return { jobs: result.rows, total };
  }

  async getStats() {
    const result = await db.query(
      `SELECT status, COUNT(*)::int as count FROM jobs GROUP BY status`
    );

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    result.rows.forEach((row: any) => {
      stats[row.status as keyof typeof stats] = row.count;
    });

    return stats;
  }

  async getThroughput() {
    const result = await db.query(
      `SELECT
         date_trunc('hour', COALESCE(completed_at, created_at)) AS hour,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM jobs
       WHERE COALESCE(completed_at, created_at) >= NOW() - INTERVAL '24 hours'
       GROUP BY hour
       ORDER BY hour ASC`
    );
    return result.rows;
  }

  // Now reflects BullMQ's real pause state instead of a Postgres flag
  // the worker had to poll for — see worker.service.ts pauseQueue/resumeQueue.
  async getHealth() {
    const result = await db.query(`SELECT last_poll_at FROM worker_heartbeat WHERE id = 1`);
    const isPaused = await jobQueue.isPaused();
    return { last_poll_at: result.rows[0]?.last_poll_at ?? null, is_paused: isPaused };
  }

  async getLatencyStats() {
    const result = await db.query(
      `SELECT
         EXTRACT(EPOCH FROM (completed_at - started_at)) AS duration_seconds
       FROM jobs
       WHERE status = 'completed'
         AND started_at IS NOT NULL
         AND completed_at IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '24 hours'
       ORDER BY duration_seconds`
    );

    const durations = result.rows.map((r: any) => Number(r.duration_seconds)).filter((n: number) => !isNaN(n));
    if (durations.length === 0) {
      return { p50: null, p95: null, avg: null, sampleSize: 0 };
    }

    const percentile = (arr: number[], p: number) => {
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, Math.min(idx, arr.length - 1))];
    };

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      p50: Math.round(percentile(durations, 50) * 10) / 10,
      p95: Math.round(percentile(durations, 95) * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      sampleSize: durations.length,
    };
  }
}

export const queueService = new QueueService();