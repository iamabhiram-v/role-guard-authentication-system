import { Worker, Job } from 'bullmq';
import { db } from '../config/database';
import { queueService } from './queue.service';
import { emailService } from './external/EmailService';
import { smsService } from './external/SmsService';
import { notificationPreferencesService } from './notificationPreferences.service';
import { redisConnection } from '../config/redis';
import { jobQueue } from '../config/bullQueue';

let worker: Worker | null = null;

const processEmailJob = async (payload: any) => {
  const { to, subject, html, body } = payload;
  if (!to || !subject) {
    throw new Error('Email job payload missing "to" or "subject"');
  }

  const result = await emailService.send({ to, subject, body: body ?? html });
  if (!result.success) {
    throw new Error(result.error || 'Email send failed');
  }
};

const processSmsJob = async (payload: any) => {
  const { to, message } = payload;
  if (!to || !message) {
    throw new Error('SMS job payload missing "to" or "message"');
  }

  const result = await smsService.send({ to, message });
  if (!result.success) {
    throw new Error(result.error || 'SMS send failed');
  }
};

const processNotificationJob = async (payload: any) => {
  const { userId, title, message } = payload;
  if (!userId || !title) {
    throw new Error('Notification job payload missing "userId" or "title"');
  }

  await db.query(
    `INSERT INTO notifications (user_id, title, message)
     VALUES ($1, $2, $3)`,
    [userId, title, message || null]
  );
};

const processors: Record<string, (payload: any) => Promise<void>> = {
  email: processEmailJob,
  sms: processSmsJob,
  notification: processNotificationJob,
};

const updateHeartbeat = async () => {
  await db.query(
    `INSERT INTO worker_heartbeat (id, last_poll_at)
     VALUES (1, NOW())
     ON CONFLICT (id) DO UPDATE SET last_poll_at = NOW()`
  );
};

export const pauseQueue = async (_userId: string) => {

  await jobQueue.pause();
};

export const resumeQueue = async () => {
  await jobQueue.resume();
};

export const getQueueControlStatus = async () => {
  const isPaused = await jobQueue.isPaused();
  const heartbeat = await db.query(`SELECT last_poll_at FROM worker_heartbeat WHERE id = 1`);
  return {
    last_poll_at: heartbeat.rows[0]?.last_poll_at ?? null,
    is_paused: isPaused,
    paused_by: null,
    paused_at: null,
  };
};

async function runJob(job: Job) {
  const dbJobId: string = job.data.dbJobId;
  const type = job.name;

  const jobRow = await db.query(`SELECT * FROM jobs WHERE id = $1`, [dbJobId]);
  const dbJob = jobRow.rows[0];
  if (!dbJob) {

    return;
  }

  await queueService.markProcessing(dbJobId);

  const processor = processors[type];
  if (!processor) {
    throw new Error(`No processor registered for job type "${type}"`);
  }

  const payload = typeof dbJob.payload === 'string' ? JSON.parse(dbJob.payload) : dbJob.payload;
  await processor(payload);
  await queueService.markCompleted(dbJobId);
  console.log(`✅ [worker] Job ${dbJobId} (${type}) completed`);
}

async function handleJobFailedAlert(dbJobId: string, type: string, error: string, attempts: number, maxAttempts: number) {
  await queueService.markFailed(dbJobId, error, attempts, maxAttempts);
  console.error(`❌ [worker] Job ${dbJobId} (${type}) failed (attempt ${attempts}/${maxAttempts}): ${error}`);

  if (attempts >= maxAttempts) {
    try {
      const admins = await db.query(
        `SELECT id, phone FROM users WHERE role = 'admin' AND is_active = true AND phone IS NOT NULL`
      );
      for (const admin of admins.rows) {
        const smsAllowed = await notificationPreferencesService.isChannelEnabled(admin.id, 'job_failure', 'sms');
        if (smsAllowed) {
          await smsService.send({
            to: admin.phone,
            message: `RoleGuard alert: ${type} job ${dbJobId.slice(0, 8)} failed permanently after ${maxAttempts} attempts.`,
          });
        }
      }
    } catch (alertErr: any) {
      console.error('[worker] Failed to send job-failure admin alert:', alertErr.message);
    }
  }
}

export const startWorker = () => {
  if (worker) return;

  worker = new Worker(
    'roleguard-jobs',
    async (job: Job) => {
      await runJob(job);
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on('completed', () => {
    // Per-job success is already logged inside runJob().
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const dbJobId: string = job.data.dbJobId;
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 3;
    await handleJobFailedAlert(dbJobId, job.name, err.message || 'Unknown error', attemptsMade, maxAttempts);
  });

  worker.on('error', (err) => {
    console.error('[worker] BullMQ worker error:', err.message);
  });


  const HEARTBEAT_INTERVAL_MS = 5000;
  updateHeartbeat();
  setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

  console.log('👷 BullMQ worker started (Redis-backed, concurrency: 5)');
};