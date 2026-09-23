import { db } from '../config/database';

export const dashboardRepository = {
  async getUserCounts(): Promise<{ total: number; active: number }> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_active)::int AS active
       FROM users`
    );
    return result.rows[0];
  },

  async getWorkspaceCount(): Promise<number> {
    const result = await db.query('SELECT COUNT(*)::int AS total FROM workspaces');
    return result.rows[0].total;
  },

  async getMemberCount(): Promise<number> {
    const result = await db.query('SELECT COUNT(*)::int AS total FROM workspace_members');
    return result.rows[0].total;
  },

  async getPendingInviteCount(): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total FROM workspace_invites WHERE status = 'pending'`
    );
    return result.rows[0].total;
  },

  async getNotificationCountByPeriod(days: number): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total FROM notifications
       WHERE created_at > NOW() - ($1::int || ' days')::interval`,
      [days]
    );
    return result.rows[0].total;
  },

  async getActivityTimeline(days: number) {
    const result = await db.query(
      `
      WITH days AS (
        SELECT generate_series(
          CURRENT_DATE - ($1::int - 1),
          CURRENT_DATE,
          '1 day'::interval
        )::date AS day
      ),
      ws AS (
        SELECT created_at::date AS day, COUNT(*)::int AS count
        FROM workspaces
        WHERE created_at > NOW() - ($1::int || ' days')::interval
        GROUP BY 1
      ),
      mem AS (
        SELECT joined_at::date AS day, COUNT(*)::int AS count
        FROM workspace_members
        WHERE joined_at > NOW() - ($1::int || ' days')::interval
        GROUP BY 1
      ),
      inv AS (
        SELECT created_at::date AS day, COUNT(*)::int AS count
        FROM workspace_invites
        WHERE created_at > NOW() - ($1::int || ' days')::interval
        GROUP BY 1
      ),
      jobs AS (
        SELECT completed_at::date AS day, COUNT(*)::int AS count
        FROM jobs
        WHERE status = 'completed'
          AND completed_at > NOW() - ($1::int || ' days')::interval
        GROUP BY 1
      )
      SELECT
        days.day::text AS date,
        COALESCE(ws.count, 0)   AS "workspacesCreated",
        COALESCE(mem.count, 0)  AS "membersJoined",
        COALESCE(inv.count, 0)  AS "invitesSent",
        COALESCE(jobs.count, 0) AS "jobsCompleted"
      FROM days
      LEFT JOIN ws   ON ws.day   = days.day
      LEFT JOIN mem  ON mem.day  = days.day
      LEFT JOIN inv  ON inv.day  = days.day
      LEFT JOIN jobs ON jobs.day = days.day
      ORDER BY days.day ASC
      `,
      [days]
    );
    return result.rows;
  },

  async getSummaryCurrentAndPrevious(days: number) {
    const result = await db.query(
      `
      WITH current_period AS (
        SELECT
          (SELECT COUNT(*) FROM workspaces
            WHERE created_at > NOW() - ($1::int || ' days')::interval)::int AS workspaces,
          (SELECT COUNT(*) FROM workspace_members
            WHERE joined_at > NOW() - ($1::int || ' days')::interval)::int AS members,
          (SELECT COUNT(*) FROM workspace_invites
            WHERE created_at > NOW() - ($1::int || ' days')::interval)::int AS invites,
          (SELECT COUNT(*) FROM jobs
            WHERE status = 'completed'
              AND completed_at > NOW() - ($1::int || ' days')::interval)::int AS jobs_completed,
          (SELECT COUNT(*) FROM jobs
            WHERE status = 'failed'
              AND COALESCE(updated_at, created_at) > NOW() - ($1::int || ' days')::interval)::int AS jobs_failed,
          (SELECT COUNT(*) FROM notifications
            WHERE created_at > NOW() - ($1::int || ' days')::interval)::int AS notifications
      ),
      previous_period AS (
        SELECT
          (SELECT COUNT(*) FROM workspaces
            WHERE created_at > NOW() - ($1::int * 2 || ' days')::interval
              AND created_at <= NOW() - ($1::int || ' days')::interval)::int AS workspaces,
          (SELECT COUNT(*) FROM workspace_members
            WHERE joined_at > NOW() - ($1::int * 2 || ' days')::interval
              AND joined_at <= NOW() - ($1::int || ' days')::interval)::int AS members,
          (SELECT COUNT(*) FROM workspace_invites
            WHERE created_at > NOW() - ($1::int * 2 || ' days')::interval
              AND created_at <= NOW() - ($1::int || ' days')::interval)::int AS invites,
          (SELECT COUNT(*) FROM jobs
            WHERE status = 'completed'
              AND completed_at > NOW() - ($1::int * 2 || ' days')::interval
              AND completed_at <= NOW() - ($1::int || ' days')::interval)::int AS jobs_completed,
          (SELECT COUNT(*) FROM jobs
            WHERE status = 'failed'
              AND COALESCE(updated_at, created_at) > NOW() - ($1::int * 2 || ' days')::interval
              AND COALESCE(updated_at, created_at) <= NOW() - ($1::int || ' days')::interval)::int AS jobs_failed,
          (SELECT COUNT(*) FROM notifications
            WHERE created_at > NOW() - ($1::int * 2 || ' days')::interval
              AND created_at <= NOW() - ($1::int || ' days')::interval)::int AS notifications
      )
      SELECT
        row_to_json(current_period)  AS current,
        row_to_json(previous_period) AS previous
      FROM current_period, previous_period
      `,
      [days]
    );
    return result.rows[0];
  },

  async getRecentActivityForWorkspaces(workspaceIds: string[], limit: number) {
    const result = await db.query(
      `
      SELECT
        'invite' AS type,
        wi.created_at AS occurred_at,
        w.name AS workspace_name,
        wi.email AS target,
        u.username AS actor_name
      FROM workspace_invites wi
      JOIN workspaces w ON w.id = wi.workspace_id
      LEFT JOIN users u ON u.id = wi.invited_by
      WHERE wi.workspace_id = ANY($1::uuid[])

      UNION ALL

      SELECT
        'member_joined' AS type,
        wm.joined_at AS occurred_at,
        w.name AS workspace_name,
        u.username AS target,
        NULL AS actor_name
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ANY($1::uuid[])

      UNION ALL

      SELECT
        'workspace_updated' AS type,
        w.updated_at AS occurred_at,
        w.name AS workspace_name,
        NULL AS target,
        NULL AS actor_name
      FROM workspaces w
      WHERE w.id = ANY($1::uuid[])
        AND w.updated_at > w.created_at

      ORDER BY occurred_at DESC
      LIMIT $2
      `,
      [workspaceIds, limit]
    );
    return result.rows;
  },
};