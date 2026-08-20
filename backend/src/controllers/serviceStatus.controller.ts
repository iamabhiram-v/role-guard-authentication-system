import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { serviceRegistry } from '../services/external/serviceRegistry';

export class ServiceStatusController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ status: 'success', data: serviceRegistry.getAll() });
    } catch (err) {
      next(err);
    }
  }
}

export const serviceStatusController = new ServiceStatusController();