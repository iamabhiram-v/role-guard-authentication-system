import { db, DbClient } from '../config/database';
import { WorkspaceRole } from '../types/workspace';

export const workspaceRepository = {
  async findBySlug(slug: string): Promise<{ id: string } | null> {
    const result = await db.query('SELECT id FROM workspaces WHERE slug = $1', [slug]);
    return result.rows[0] ?? null;
  },

  async create(
    client: DbClient,
    data: { name: string; slug: string; description?: string | null; ownerId: string }
  ) {
    const result = await client.query(
      `INSERT INTO workspaces (name, slug, description, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.slug, data.description ?? null, data.ownerId]
    );
    return result.rows[0];
  },

  async findAllForUser(userId: string) {
    const result = await db.query(
      `SELECT w.*, wm.role,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id: string) {
    const result = await db.query(
      `SELECT w.*,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count
       FROM workspaces w WHERE w.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findNameById(id: string): Promise<string | null> {
    const result = await db.query('SELECT name FROM workspaces WHERE id = $1', [id]);
    return result.rows[0]?.name ?? null;
  },

  async update(id: string, fields: string[], values: unknown[]) {
    const result = await db.query(
      `UPDATE workspaces SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async updateOwner(client: DbClient, id: string, newOwnerId: string): Promise<void> {
    await client.query(
      'UPDATE workspaces SET owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newOwnerId, id]
    );
  },

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM workspaces WHERE id = $1', [id]);
  },

  async getTopByMemberCount(limit: number) {
    const result = await db.query(
      `SELECT w.id, w.name,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count,
              w.created_at
       FROM workspaces w
       ORDER BY member_count DESC, w.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
};

export const workspaceMemberRepository = {
  async findMembership(workspaceId: string, userId: string) {
    const result = await db.query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return result.rows[0] ?? null;
  },

  async findRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const result = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return result.rows[0]?.role ?? null;
  },

  async insert(
    client: DbClient,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void> {
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [workspaceId, userId, role]
    );
  },

  async updateRole(workspaceId: string, userId: string, role: WorkspaceRole) {
    const result = await db.query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3 RETURNING *',
      [role, workspaceId, userId]
    );
    return result.rows[0];
  },

  async updateRoleWithClient(
    client: DbClient,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void> {
    await client.query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
      [role, workspaceId, userId]
    );
  },

  async delete(workspaceId: string, userId: string): Promise<void> {
    await db.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
  },

  async findAllWithUsers(workspaceId: string) {
    const result = await db.query(
      `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.email, u.username
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, wm.joined_at ASC`,
      [workspaceId]
    );
    return result.rows;
  },

  async findWorkspaceIdsByUser(userId: string): Promise<string[]> {
    const result = await db.query(
      'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
      [userId]
    );
    return result.rows.map((r) => r.workspace_id);
  },
};

export const workspaceInviteRepository = {
  async create(data: {
    workspaceId: string;
    email: string;
    role: string;
    invitedBy: string;
    token: string;
    expiresAt: Date;
  }) {
    const result = await db.query(
      `INSERT INTO workspace_invites (workspace_id, email, role, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.workspaceId, data.email, data.role, data.invitedBy, data.token, data.expiresAt]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await db.query('SELECT * FROM workspace_invites WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  },

  async findPendingByWorkspace(workspaceId: string) {
    const result = await db.query(
      `SELECT * FROM workspace_invites
       WHERE workspace_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [workspaceId]
    );
    return result.rows;
  },

  async findPendingForEmail(userEmail: string) {
    const result = await db.query(
      `SELECT wi.*, w.name AS workspace_name, w.description AS workspace_description
       FROM workspace_invites wi
       JOIN workspaces w ON w.id = wi.workspace_id
       WHERE wi.email = $1 AND wi.status = 'pending' AND wi.expires_at > NOW()
       ORDER BY wi.created_at DESC`,
      [userEmail]
    );
    return result.rows;
  },

  async setStatus(
    id: string,
    status: 'accepted' | 'declined' | 'revoked' | 'expired'
  ): Promise<void> {
    await db.query('UPDATE workspace_invites SET status = $1 WHERE id = $2', [status, id]);
  },

  async setStatusWithClient(
    client: DbClient,
    id: string,
    status: 'accepted' | 'declined' | 'revoked' | 'expired'
  ): Promise<void> {
    await client.query('UPDATE workspace_invites SET status = $1 WHERE id = $2', [status, id]);
  },

  async revokePending(id: string, workspaceId: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE workspace_invites SET status = 'revoked'
       WHERE id = $1 AND workspace_id = $2 AND status = 'pending'
       RETURNING id`,
      [id, workspaceId]
    );
    return result.rows.length > 0;
  },
};