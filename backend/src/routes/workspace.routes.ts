// src/routes/workspace.routes.ts
import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createWorkspaceSchema, inviteMemberSchema } from '../validations/workspace.validation';

const router = Router();

router.use(authenticate);

// Activity feed — must come before /:workspaceId to avoid being swallowed by that param route
router.get('/activity/recent', workspaceController.getRecentActivity.bind(workspaceController));

// Workspace CRUD
router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace.bind(workspaceController));
router.get('/', workspaceController.getWorkspacesForUser.bind(workspaceController));
router.get('/:workspaceId', workspaceController.getWorkspaceById.bind(workspaceController));
router.put('/:workspaceId', workspaceController.updateWorkspace.bind(workspaceController));
router.delete('/:workspaceId', workspaceController.deleteWorkspace.bind(workspaceController));

// Members
router.get('/:workspaceId/members', workspaceController.getMembers.bind(workspaceController));
router.post('/:workspaceId/members/invite', validate(inviteMemberSchema), workspaceController.inviteMember.bind(workspaceController));
router.put('/:workspaceId/members/:targetUserId/role', workspaceController.updateMemberRole.bind(workspaceController));
router.delete('/:workspaceId/members/:targetUserId', workspaceController.removeMember.bind(workspaceController));
router.post('/:workspaceId/leave', workspaceController.leaveWorkspace.bind(workspaceController));

// Invitations - ADMIN (workspace owner/admin)
router.get('/:workspaceId/invites', workspaceController.listInvites.bind(workspaceController));
router.delete('/:workspaceId/invites/:inviteId', workspaceController.revokeInvite.bind(workspaceController));

// Invitations - USER (for receiving invites)
router.get('/invitations/pending', workspaceController.getPendingInvitations.bind(workspaceController));
router.post('/invitations/:inviteId/accept', workspaceController.acceptInvite.bind(workspaceController));
router.post('/invitations/:inviteId/decline', workspaceController.declineInvite.bind(workspaceController));

// Ownership
router.post('/:workspaceId/transfer-ownership', workspaceController.transferOwnership.bind(workspaceController));

export default router;