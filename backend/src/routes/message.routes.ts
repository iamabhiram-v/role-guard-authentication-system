import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Loads the last 50 messages for a workspace — used once when the chat
// panel opens. New messages after that arrive live over the socket.
router.get('/:workspaceId/messages', messageController.getMessages.bind(messageController));

export default router;