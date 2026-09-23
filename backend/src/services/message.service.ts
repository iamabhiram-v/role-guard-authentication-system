import { messageRepository } from '../repositories';

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_email: string;
  sender_username: string;
  message: string;
  created_at: string;
}

export const messageService = {
  async getMessages(
    workspaceId: string,
    userId: string,
    limit = 50
  ): Promise<WorkspaceMessage[]> {
    const role = await messageRepository.isMember(workspaceId, userId);
    if (!role) {
      const err: any = new Error('You are not a member of this workspace');
      err.statusCode = 403;
      throw err;
    }

    const rows = await messageRepository.findRecentByWorkspace(workspaceId, limit);
    return rows.reverse();
  },

  async createMessage(
    workspaceId: string,
    senderId: string,
    message: string
  ): Promise<WorkspaceMessage> {
    const role = await messageRepository.isMember(workspaceId, senderId);
    if (!role) {
      const err: any = new Error('You are not a member of this workspace');
      err.statusCode = 403;
      throw err;
    }

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

    const row = await messageRepository.insert(workspaceId, senderId, trimmed);
    const sender = await messageRepository.findSenderDetails(senderId);

    return {
      ...row,
      sender_email:    sender?.email || '',
      sender_username: sender?.full_name || sender?.username || '',
    };
  },
};