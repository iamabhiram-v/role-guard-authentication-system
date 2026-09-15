import { db } from '../config/database';

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_email: string;
  sender_username: string;
  message: string;
  created_at: string;
}

const requireMembership = async (workspaceId: string, userId: string) => {
  const result = await db.query(
    `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (result.rows.length === 0) {
    const err: any = new Error('You are not a member of this workspace');
    err.statusCode = 403;
    throw err;
  }
  return result.rows[0].role as string;
};

export const messageService = {
  // Called from the REST endpoint when a user first opens the chat panel,
  // to load recent history. Real-time delivery of new messages happens over
  // the socket (see config/socket.ts) — this is only for the initial load
  // and page refreshes.
  async getMessages(workspaceId: string, userId: string, limit = 50): Promise<WorkspaceMessage[]> {
    await requireMembership(workspaceId, userId);

    const result = await db.query(
      `SELECT m.id, m.workspace_id, m.sender_id, u.email AS sender_email,
              COALESCE(NULLIF(u.full_name, ''), u.username) AS sender_username,
              m.message, m.created_at
       FROM workspace_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.workspace_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );

    // Reverse so the oldest of this page is first — the UI renders top-to-bottom.
    return result.rows.reverse();
  },

  // Called by the socket handler (config/socket.ts) when a 'send-message'
  // event arrives — this is the single place that actually writes a message
  // row, whether or not the caller came in over HTTP or a socket.
  async createMessage(workspaceId: string, senderId: string, message: string): Promise<WorkspaceMessage> {
    await requireMembership(workspaceId, senderId);

    const trimmed = message.trim();
    if (!trimmed) {
      const err: any = new Error('Message cannot be empty');
      err.statusCode = 400;
      throw err;
    }
    if (trimmed.length > 2000) {
      const err: any = new Error('Message is too long (max 2000 characters)');
      err.statusCode = 400;
      throw err;
    }

    const result = await db.query(
      `INSERT INTO workspace_messages (workspace_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, workspace_id, sender_id, message, created_at`,
      [workspaceId, senderId, trimmed]
    );

    const row = result.rows[0];

    const sender = await db.query(`SELECT email, full_name, username FROM users WHERE id = $1`, [senderId]);

    return {
      ...row,
      sender_email: sender.rows[0].email,
      sender_username: sender.rows[0].full_name || sender.rows[0].username,
    };
  },
};