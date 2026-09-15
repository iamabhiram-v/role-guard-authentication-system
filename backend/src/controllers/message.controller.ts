import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { messageService } from '../services/message.service';

export class MessageController {
  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const messages = await messageService.getMessages(workspaceId, req.user!.userId);
      res.status(200).json({ status: 'success', data: messages });
    } catch (err) {
      next(err);
    }
  }
}

export const messageController = new MessageController();