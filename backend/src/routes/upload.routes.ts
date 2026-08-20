import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadController } from '../controllers/upload.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);
router.post('/avatar', upload.single('file'), uploadController.uploadAvatar);

export default router;