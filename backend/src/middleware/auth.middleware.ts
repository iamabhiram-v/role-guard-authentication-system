import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({ status: 'error', message: 'No token provided' });
      return;
    }

    const decoded = verifyAccessToken(token);

    req.user = decoded as unknown as { userId: string; email: string; role: string };
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

export const authenticate = authMiddleware;

// Must run after authenticate/authMiddleware — relies on req.user.role
// already being set from the decoded JWT. Returns 403 (not 401) since
// the user is authenticated, just not permitted for this resource.
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ status: 'error', message: 'You do not have permission to access this resource' });
      return;
    }
    next();
  };
};