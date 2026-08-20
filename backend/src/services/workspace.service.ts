import crypto from 'crypto';
import { db } from '../config/database';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../utils/errors';
import { WorkspaceRole } from '../types/workspace';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';

const INVITE_EXPIRY_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);

const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = slugify(name) || 'workspace';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${crypto.randomBytes(3).toString('hex')}`;
    const existing = await db.query('SELECT id FROM workspaces WHERE slug = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
};

const getMembership = async (workspaceId: string, userId: string) => {
  const result = await db.query(
    'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return result.rows[0] || null;
};

const requireMembership = async (workspaceId: string, userId: string) => {
  const membership = await getMembership(workspaceId, userId);
  if (!membership) {
    throw new NotFoundError('Workspace not found');
  }
  return membership;
};

const requireRole = async (workspaceId: string, userId: string, allowedRoles: WorkspaceRole[]) => {
  const membership = await requireMembership(workspaceId, userId);
  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenError('You do not have permission to perform this action');
  }
  return membership;
};

export const workspaceService = {
  async createWorkspace(userId: string, data: { name: string; description?: string }) {
    const slug = await generateUniqueSlug(data.name);
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const wsResult = await client.query(
        `INSERT INTO workspaces (name, slug, description, owner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.name, slug, data.description || null, userId]
      );
      const workspace = wsResult.rows[0];

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [workspace.id, userId]
      );

      await client.query('COMMIT');
      return { ...workspace, role: 'owner', member_count: 1 };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getWorkspacesForUser(userId: string) {
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

  async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await requireMembership(workspaceId, userId);
    const result = await db.query(
      `SELECT w.*,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count
       FROM workspaces w WHERE w.id = $1`,
      [workspaceId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Workspace not found');
    return { ...result.rows[0], role: membership.role };
  },

  async updateWorkspace(workspaceId: string, userId: string, data: { name?: string; description?: string }) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (fields.length === 0) {
      throw new BadRequestError('No fields provided to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(workspaceId);

    const result = await db.query(
      `UPDATE workspaces SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async deleteWorkspace(workspaceId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner']);
    await db.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
    return { message: 'Workspace deleted successfully' };
  },

  async getMembers(workspaceId: string, userId: string) {
    await requireMembership(workspaceId, userId);
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

  async inviteMember(workspaceId: string, inviterId: string, email: string, role: 'admin' | 'member') {
    const inviter = await requireRole(workspaceId, inviterId, ['owner', 'admin']);

    const workspaceResult = await db.query('SELECT name FROM workspaces WHERE id = $1', [workspaceId]);
    const workspaceName = workspaceResult.rows[0]?.name || 'a workspace';

    const inviterResult = await db.query('SELECT username, email FROM users WHERE id = $1', [inviterId]);
    const inviterName = inviterResult.rows[0]?.username || inviterResult.rows[0]?.email || 'Someone';

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      const alreadyMember = await getMembership(workspaceId, existingUser.rows[0].id);
      if (alreadyMember) {
        throw new BadRequestError('This user is already a member of the workspace');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const result = await db.query(
      `INSERT INTO workspace_invites (workspace_id, email, role, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [workspaceId, email, role, inviterId, token, expiresAt]
    );

    const inviteLink = `${FRONTEND_URL}/invites/${token}/accept`;

 
    const invitedUserId = existingUser.rows.length > 0 ? existingUser.rows[0].id : null;
    const emailAllowed = invitedUserId
      ? await notificationPreferencesService.isChannelEnabled(invitedUserId, 'workspace_invite', 'email')
      : true;

    if (emailAllowed) {
      await queueService.enqueue(
        'email',
        {
          to: email,
          subject: `${inviterName} invited you to join ${workspaceName} on RoleGuard`,
          html: `
            <p>Hi,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on RoleGuard as a <strong>${role}</strong>.</p>
            <p><a href="${inviteLink}">Click here to accept the invite</a></p>
            <p>This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
          `,
        },
        { createdBy: inviterId }
      );
    }

    // If the invited email already belongs to a registered user, also push an in-app notification
    if (invitedUserId) {
      const inAppAllowed = await notificationPreferencesService.isChannelEnabled(invitedUserId, 'workspace_invite', 'in_app');
      if (inAppAllowed) {
        await queueService.enqueue(
          'notification',
          {
            userId: invitedUserId,
            title: `Invite to ${workspaceName}`,
            message: `${inviterName} invited you to join ${workspaceName} as a ${role}.`,
          },
          { createdBy: inviterId }
        );
      }
    }

    return result.rows[0];
  },

  async listInvites(workspaceId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);
    const result = await db.query(
      `SELECT * FROM workspace_invites WHERE workspace_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [workspaceId]
    );
    return result.rows;
  },

  async getPendingInvitationsForUser(userEmail: string) {
    const result = await db.query(
      `SELECT wi.*, w.name as workspace_name, w.description as workspace_description
       FROM workspace_invites wi
       JOIN workspaces w ON w.id = wi.workspace_id
       WHERE wi.email = $1 AND wi.status = 'pending' AND wi.expires_at > NOW()
       ORDER BY wi.created_at DESC`,
      [userEmail]
    );
    return result.rows;
  },

  async revokeInvite(workspaceId: string, inviteId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);
    const result = await db.query(
      `UPDATE workspace_invites SET status = 'revoked'
       WHERE id = $1 AND workspace_id = $2 AND status = 'pending'
       RETURNING id`,
      [inviteId, workspaceId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Invite not found');
    return { message: 'Invite revoked' };
  },

  async acceptInvite(inviteId: string, userId: string, userEmail: string) {
    const inviteResult = await db.query(
      `SELECT * FROM workspace_invites WHERE id = $1`,
      [inviteId]
    );
    if (inviteResult.rows.length === 0) throw new NotFoundError('Invite not found');
    const invite = inviteResult.rows[0];

    if (invite.status !== 'pending') {
      throw new BadRequestError('This invite is no longer valid');
    }
    if (new Date(invite.expires_at) < new Date()) {
      await db.query(`UPDATE workspace_invites SET status = 'expired' WHERE id = $1`, [invite.id]);
      throw new BadRequestError('This invite has expired');
    }

    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestError('This invite was sent to a different email address');
    }

    const existing = await getMembership(invite.workspace_id, userId);
    if (existing) {
      throw new BadRequestError('You are already a member of this workspace');
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
        [invite.workspace_id, userId, invite.role]
      );
      await client.query(`UPDATE workspace_invites SET status = 'accepted' WHERE id = $1`, [invite.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { message: 'Invite accepted', workspaceId: invite.workspace_id };
  },

  async declineInvite(inviteId: string, userEmail: string) {
    const inviteResult = await db.query(
      `SELECT * FROM workspace_invites WHERE id = $1`,
      [inviteId]
    );
    if (inviteResult.rows.length === 0) throw new NotFoundError('Invite not found');
    const invite = inviteResult.rows[0];

    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestError('This invite was sent to a different email address');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestError('This invite is no longer valid');
    }

    await db.query(`UPDATE workspace_invites SET status = 'declined' WHERE id = $1`, [invite.id]);
    return { message: 'Invite declined' };
  },

  async updateMemberRole(workspaceId: string, targetUserId: string, requesterId: string, newRole: 'admin' | 'member') {
    await requireRole(workspaceId, requesterId, ['owner']);

    const target = await getMembership(workspaceId, targetUserId);
    if (!target) throw new NotFoundError('Member not found');
    if (target.role === 'owner') {
      throw new BadRequestError('Use transfer ownership to change the owner');
    }

    const result = await db.query(
      `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3 RETURNING *`,
      [newRole, workspaceId, targetUserId]
    );
    return result.rows[0];
  },

  async removeMember(workspaceId: string, targetUserId: string, requesterId: string) {
    const requester = await requireRole(workspaceId, requesterId, ['owner', 'admin']);

    const target = await getMembership(workspaceId, targetUserId);
    if (!target) throw new NotFoundError('Member not found');
    if (target.role === 'owner') {
      throw new BadRequestError('The workspace owner cannot be removed');
    }
    if (requester.role === 'admin' && target.role === 'admin') {
      throw new ForbiddenError('Only the owner can remove another admin');
    }

    await db.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [
      workspaceId,
      targetUserId,
    ]);
    return { message: 'Member removed' };
  },

  async leaveWorkspace(workspaceId: string, userId: string) {
    const membership = await requireMembership(workspaceId, userId);
    if (membership.role === 'owner') {
      throw new BadRequestError('Transfer ownership before leaving this workspace');
    }
    await db.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [
      workspaceId,
      userId,
    ]);
    return { message: 'You have left the workspace' };
  },

  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerUserId: string) {
    await requireRole(workspaceId, currentOwnerId, ['owner']);

    const newOwnerMembership = await getMembership(workspaceId, newOwnerUserId);
    if (!newOwnerMembership) {
      throw new BadRequestError('The selected user must already be a member of the workspace');
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE workspace_members SET role = 'admin' WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, currentOwnerId]
      );
      await client.query(
        `UPDATE workspace_members SET role = 'owner' WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, newOwnerUserId]
      );
      await client.query(`UPDATE workspaces SET owner_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
        newOwnerUserId,
        workspaceId,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { message: 'Ownership transferred' };
  },

  async getRecentActivity(userId: string, limit = 10) {
    const workspaceIds = await db.query(
      `SELECT workspace_id FROM workspace_members WHERE user_id = $1`,
      [userId]
    );
    const ids = workspaceIds.rows.map((r) => r.workspace_id);
    if (ids.length === 0) return [];

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
      [ids, limit]
    );

    return result.rows;
  },
};