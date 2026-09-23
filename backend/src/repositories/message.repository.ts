import { db } from '../config/database';
import { WorkspaceMessage } from '../services/message.service';

export const messageRepository = {
  async findRecentByWorkspace(
    workspaceId: string,
    limit: number
  ): Promise<WorkspaceMessage[]> {
    const result = await db.query(
      `SELECT m.id, m.workspace_id, m.sender_id,
              u.email AS sender_email,
              COALESCE(NULLIF(u.full_name, ''), u.username) AS sender_username,
              m.message, m.created_at
       FROM workspace_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.workspace_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );
    return result.rows;
  },

  async insert(
    workspaceId: string,
    senderId: string,
    message: string
  ) {
    const result = await db.query(
      `INSERT INTO workspace_messages (workspace_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, workspace_id, sender_id, message, created_at`,
      [workspaceId, senderId, message]
    );
    return result.rows[0];
  },

  async findSenderDetails(
    senderId: string
  ): Promise<{ email: string; full_name: string; username: string } | null> {
    const result = await db.query(
      'SELECT email, full_name, username FROM users WHERE id = $1',
      [senderId]
    );
    return result.rows[0] ?? null;
  },

  async isMember(workspaceId: string, userId: string): Promise<string | null> {
    const result = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return result.rows[0]?.role ?? null;
  },
};