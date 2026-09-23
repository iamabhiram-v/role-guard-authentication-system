import { jobRepository, workerHeartbeatRepository } from '../repositories';
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

    const job = await jobRepository.insert({ type, payload, maxAttempts, scheduledAt, createdBy });

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
    const job = await jobRepository.hold(jobId);
    if (!job) return null;

    const bullJob = await jobQueue.getJob(jobId);
    if (bullJob) await bullJob.remove();

    return job;
  }

  async releaseJob(jobId: string) {
    const job = await jobRepository.release(jobId);
    if (!job) return null;

    await jobQueue.add(job.type, { dbJobId: job.id, payload: job.payload }, {
      jobId: job.id,
      attempts: job.max_attempts,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return job;
  }

  async markProcessing(jobId: string) {
    await jobRepository.markProcessing(jobId);
  }

  async markCompleted(jobId: string) {
    await jobRepository.markCompleted(jobId);
  }

  async markFailed(jobId: string, error: string, attempts: number, maxAttempts: number) {
    const willRetry = attempts < maxAttempts;
    const status = willRetry ? 'pending' : 'failed';

    await jobRepository.markFailed(jobId, status, error, attempts);
  }

  // Manual retry from the dashboard — resets attempts and re-adds to
  // BullMQ with a fresh attempt budget, same as before but pushed
  // through Redis instead of just flipping status back to 'pending'
  // and waiting for the next poll.
  async retryJob(jobId: string) {
    const job = await jobRepository.resetFailedForRetry(jobId);
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
    const { rows, total } = await jobRepository.findPaged({
      status: filters.status,
      type: filters.type,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return { jobs: rows, total };
  }

  async getStats() {
    const rows = await jobRepository.countByStatus();

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    rows.forEach((row: any) => {
      stats[row.status as keyof typeof stats] = row.count;
    });

    return stats;
  }

  async getThroughput() {
    return jobRepository.throughputLast24h();
  }

  // Now reflects BullMQ's real pause state instead of a Postgres flag
  // the worker had to poll for — see worker.service.ts pauseQueue/resumeQueue.
  async getHealth() {
    const lastPollAt = await workerHeartbeatRepository.findLastPollAt();
    const isPaused = await jobQueue.isPaused();
    return { last_poll_at: lastPollAt, is_paused: isPaused };
  }

  async getLatencyStats() {
    const rows = await jobRepository.completedDurationsLast24h();

    const durations = rows.map((r: any) => Number(r.duration_seconds)).filter((n: number) => !isNaN(n));
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
