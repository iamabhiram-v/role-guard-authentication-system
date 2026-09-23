import { db } from '../config/database';
import { JobType } from '../types/job';

export interface JobListFilters {
  status?: string;
  type?: string;
  limit: number;
  offset: number;
}

export const jobRepository = {
  async insert(data: {
    type: JobType;
    payload: Record<string, any>;
    maxAttempts: number;
    scheduledAt: Date;
    createdBy: string | null;
  }) {
    const result = await db.query(
      `INSERT INTO jobs (type, payload, max_attempts, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.type, JSON.stringify(data.payload), data.maxAttempts, data.scheduledAt, data.createdBy]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await db.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  async hold(id: string) {
    const result = await db.query(
      `UPDATE jobs SET is_held = true, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async release(id: string) {
    const result = await db.query(
      `UPDATE jobs SET is_held = false, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async markProcessing(id: string): Promise<void> {
    await db.query(
      `UPDATE jobs SET status = 'processing', started_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async markCompleted(id: string): Promise<void> {
    await db.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async markFailed(id: string, status: string, error: string, attempts: number): Promise<void> {
    await db.query(
      `UPDATE jobs SET status = $1, error = $2, attempts = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, error, attempts, id]
    );
  },

  async resetFailedForRetry(id: string) {
    const result = await db.query(
      `UPDATE jobs SET status = 'pending', scheduled_at = NOW(), error = NULL, attempts = 0, updated_at = NOW()
       WHERE id = $1 AND status = 'failed'
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findPaged(filters: JobListFilters) {
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

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM jobs ${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const result = await db.query(
      `SELECT * FROM jobs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, filters.limit, filters.offset]
    );

    return { rows: result.rows, total };
  },

  async countByStatus() {
    const result = await db.query(
      `SELECT status, COUNT(*)::int as count FROM jobs GROUP BY status`
    );
    return result.rows;
  },

  async throughputLast24h() {
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
  },

  async completedDurationsLast24h() {
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
    return result.rows;
  },

  async deleteCompletedOlderThan7Days(): Promise<void> {
    await db.query(
      `DELETE FROM jobs WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'`
    );
  },
};

export const workerHeartbeatRepository = {
  async touch(): Promise<void> {
    await db.query(
      `INSERT INTO worker_heartbeat (id, last_poll_at)
       VALUES (1, NOW())
       ON CONFLICT (id) DO UPDATE SET last_poll_at = NOW()`
    );
  },

  async findLastPollAt(): Promise<Date | null> {
    const result = await db.query(`SELECT last_poll_at FROM worker_heartbeat WHERE id = 1`);
    return result.rows[0]?.last_poll_at ?? null;
  },
};
