import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { workspaceService } from '../services/workspace.service';

export class WorkspaceController {
  async createWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const workspace = await workspaceService.createWorkspace(userId, req.body);
      res.status(201).json({ status: 'success', message: 'Workspace created', data: workspace });
    } catch (err) {
      next(err);
    }
  }

  async getWorkspacesForUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const workspaces = await workspaceService.getWorkspacesForUser(userId);
      res.status(200).json({ status: 'success', message: 'Workspaces retrieved', data: workspaces });
    } catch (err) {
      next(err);
    }
  }

  async getWorkspaceById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);
      res.status(200).json({ status: 'success', message: 'Workspace retrieved', data: workspace });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const workspace = await workspaceService.updateWorkspace(workspaceId, userId, req.body);
      res.status(200).json({ status: 'success', message: 'Workspace updated', data: workspace });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const result = await workspaceService.deleteWorkspace(workspaceId, userId);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const members = await workspaceService.getMembers(workspaceId, userId);
      res.status(200).json({ status: 'success', message: 'Members retrieved', data: members });
    } catch (err) {
      next(err);
    }
  }

  async inviteMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const { email, role } = req.body;
      const invite = await workspaceService.inviteMember(workspaceId, userId, email, role);
      res.status(201).json({ status: 'success', message: 'Invite sent', data: invite });
    } catch (err) {
      next(err);
    }
  }

  async listInvites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const invites = await workspaceService.listInvites(workspaceId, userId);
      res.status(200).json({ status: 'success', message: 'Invites retrieved', data: invites });
    } catch (err) {
      next(err);
    }
  }

  async getPendingInvitations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user!.email;
      const invitations = await workspaceService.getPendingInvitationsForUser(userEmail);
      res.status(200).json({ status: 'success', message: 'Pending invitations retrieved', data: invitations });
    } catch (err) {
      next(err);
    }
  }

  async revokeInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId, inviteId } = req.params;
      const result = await workspaceService.revokeInvite(workspaceId, inviteId, userId);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;
      const { inviteId } = req.params;
      const result = await workspaceService.acceptInvite(inviteId, userId, userEmail);
      res.status(200).json({ status: 'success', message: result.message, data: result });
    } catch (err) {
      next(err);
    }
  }

  async declineInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user!.email;
      const { inviteId } = req.params;
      const result = await workspaceService.declineInvite(inviteId, userEmail);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId, targetUserId } = req.params;
      const { role } = req.body;
      const member = await workspaceService.updateMemberRole(workspaceId, targetUserId, userId, role);
      res.status(200).json({ status: 'success', message: 'Member role updated', data: member });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId, targetUserId } = req.params;
      const result = await workspaceService.removeMember(workspaceId, targetUserId, userId);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async leaveWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const result = await workspaceService.leaveWorkspace(workspaceId, userId);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async transferOwnership(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { workspaceId } = req.params;
      const { newOwnerId } = req.body;
      const result = await workspaceService.transferOwnership(workspaceId, userId, newOwnerId);
      res.status(200).json({ status: 'success', message: result.message });
    } catch (err) {
      next(err);
    }
  }

  async getRecentActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const activity = await workspaceService.getRecentActivity(userId);
      res.status(200).json({ status: 'success', data: activity });
    } catch (err) {
      next(err);
    }
  }
}

export const workspaceController = new WorkspaceController();