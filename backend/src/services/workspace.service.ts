import crypto from 'crypto';
import { db } from '../config/database';
import {
  workspaceRepository,
  workspaceMemberRepository,
  workspaceInviteRepository,
  userRepository,
} from '../repositories';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { WorkspaceRole } from '../types/workspace';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';

const INVITE_EXPIRY_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const slugify = (name: string): string =>
  name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);

const generateUniqueSlug = async (name: string): Promise<string> => {
  const base = slugify(name) || 'workspace';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${crypto.randomBytes(3).toString('hex')}`;
    const existing = await workspaceRepository.findBySlug(candidate);
    if (!existing) return candidate;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
};

const getMembership = (workspaceId: string, userId: string) =>
  workspaceMemberRepository.findMembership(workspaceId, userId);

const requireMembership = async (workspaceId: string, userId: string) => {
  const membership = await getMembership(workspaceId, userId);
  if (!membership) throw new NotFoundError('Workspace not found');
  return membership;
};

const requireRole = async (
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[]
) => {
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
      const workspace = await workspaceRepository.create(client, {
        name:        data.name,
        slug,
        description: data.description,
        ownerId:     userId,
      });
      await workspaceMemberRepository.insert(client, workspace.id, userId, 'owner');
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
    return workspaceRepository.findAllForUser(userId);
  },

  async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await requireMembership(workspaceId, userId);
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    return { ...workspace, role: membership.role };
  },

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: { name?: string; description?: string; iconUrl?: string }
  ) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name        !== undefined) { fields.push(`name = $${idx++}`);        values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.iconUrl     !== undefined) { fields.push(`icon_url = $${idx++}`);    values.push(data.iconUrl); }

    if (fields.length === 0) throw new BadRequestError('No fields provided to update');

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(workspaceId);

    return workspaceRepository.update(workspaceId, fields, values);
  },

  async deleteWorkspace(workspaceId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner']);
    await workspaceRepository.delete(workspaceId);
    return { message: 'Workspace deleted successfully' };
  },

  async getMembers(workspaceId: string, userId: string) {
    await requireMembership(workspaceId, userId);
    return workspaceMemberRepository.findAllWithUsers(workspaceId);
  },

  async inviteMember(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: 'admin' | 'member'
  ) {
    await requireRole(workspaceId, inviterId, ['owner', 'admin']);

    const workspaceName = await workspaceRepository.findNameById(workspaceId) ?? 'a workspace';
    const inviter = await userRepository.findUsernameAndEmail(inviterId);
    const inviterName = inviter?.username ?? inviter?.email ?? 'Someone';

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const alreadyMember = await getMembership(workspaceId, existingUser.id);
      if (alreadyMember) throw new BadRequestError('This user is already a member of the workspace');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invite = await workspaceInviteRepository.create({
      workspaceId,
      email,
      role,
      invitedBy: inviterId,
      token,
      expiresAt,
    });

    const inviteLink = `${FRONTEND_URL}/invites/${token}/accept`;
    const invitedUserId = existingUser?.id ?? null;

    const emailAllowed = invitedUserId
      ? await notificationPreferencesService.isChannelEnabled(invitedUserId, 'workspace_invite', 'email')
      : true;

    if (emailAllowed) {
      await queueService.enqueue(
        'email',
        {
          to:      email,
          subject: `${inviterName} invited you to join ${workspaceName} on RoleGuard`,
          html:    `
            <p>Hi,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on RoleGuard as a <strong>${role}</strong>.</p>
            <p><a href="${inviteLink}">Click here to accept the invite</a></p>
            <p>This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
          `,
        },
        { createdBy: inviterId }
      );
    }

    if (invitedUserId) {
      const inAppAllowed = await notificationPreferencesService.isChannelEnabled(
        invitedUserId, 'workspace_invite', 'in_app'
      );
      if (inAppAllowed) {
        await queueService.enqueue(
          'notification',
          {
            userId:  invitedUserId,
            title:   `Invite to ${workspaceName}`,
            message: `${inviterName} invited you to join ${workspaceName} as a ${role}.`,
          },
          { createdBy: inviterId }
        );
      }
    }

    return invite;
  },

  async listInvites(workspaceId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);
    return workspaceInviteRepository.findPendingByWorkspace(workspaceId);
  },

  async getPendingInvitationsForUser(userEmail: string) {
    return workspaceInviteRepository.findPendingForEmail(userEmail);
  },

  async revokeInvite(workspaceId: string, inviteId: string, userId: string) {
    await requireRole(workspaceId, userId, ['owner', 'admin']);
    const revoked = await workspaceInviteRepository.revokePending(inviteId, workspaceId);
    if (!revoked) throw new NotFoundError('Invite not found');
    return { message: 'Invite revoked' };
  },

  async acceptInvite(inviteId: string, userId: string, userEmail: string) {
    const invite = await workspaceInviteRepository.findById(inviteId);
    if (!invite) throw new NotFoundError('Invite not found');

    if (invite.status !== 'pending') {
      throw new BadRequestError('This invite is no longer valid');
    }
    if (new Date(invite.expires_at) < new Date()) {
      await workspaceInviteRepository.setStatus(invite.id, 'expired');
      throw new BadRequestError('This invite has expired');
    }
    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestError('This invite was sent to a different email address');
    }

    const existing = await getMembership(invite.workspace_id, userId);
    if (existing) throw new BadRequestError('You are already a member of this workspace');

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await workspaceMemberRepository.insert(client, invite.workspace_id, userId, invite.role);
      await workspaceInviteRepository.setStatusWithClient(client, invite.id, 'accepted');
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
    const invite = await workspaceInviteRepository.findById(inviteId);
    if (!invite) throw new NotFoundError('Invite not found');

    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestError('This invite was sent to a different email address');
    }
    if (invite.status !== 'pending') {
      throw new BadRequestError('This invite is no longer valid');
    }

    await workspaceInviteRepository.setStatus(invite.id, 'declined');
    return { message: 'Invite declined' };
  },

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    requesterId: string,
    newRole: 'admin' | 'member'
  ) {
    await requireRole(workspaceId, requesterId, ['owner']);

    const target = await getMembership(workspaceId, targetUserId);
    if (!target) throw new NotFoundError('Member not found');
    if (target.role === 'owner') throw new BadRequestError('Use transfer ownership to change the owner');

    return workspaceMemberRepository.updateRole(workspaceId, targetUserId, newRole);
  },

  async removeMember(workspaceId: string, targetUserId: string, requesterId: string) {
    const requester = await requireRole(workspaceId, requesterId, ['owner', 'admin']);

    const target = await getMembership(workspaceId, targetUserId);
    if (!target) throw new NotFoundError('Member not found');
    if (target.role === 'owner') throw new BadRequestError('The workspace owner cannot be removed');
    if (requester.role === 'admin' && target.role === 'admin') {
      throw new ForbiddenError('Only the owner can remove another admin');
    }

    await workspaceMemberRepository.delete(workspaceId, targetUserId);
    return { message: 'Member removed' };
  },

  async leaveWorkspace(workspaceId: string, userId: string) {
    const membership = await requireMembership(workspaceId, userId);
    if (membership.role === 'owner') {
      throw new BadRequestError('Transfer ownership before leaving this workspace');
    }
    await workspaceMemberRepository.delete(workspaceId, userId);
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
      await workspaceMemberRepository.updateRoleWithClient(client, workspaceId, currentOwnerId, 'admin');
      await workspaceMemberRepository.updateRoleWithClient(client, workspaceId, newOwnerUserId, 'owner');
      await workspaceRepository.updateOwner(client, workspaceId, newOwnerUserId);
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
    const workspaceIds = await workspaceMemberRepository.findWorkspaceIdsByUser(userId);
    if (workspaceIds.length === 0) return [];
    return dashboardRepository.getRecentActivityForWorkspaces(workspaceIds, limit);
  },
};

import { dashboardRepository } from '../repositories';