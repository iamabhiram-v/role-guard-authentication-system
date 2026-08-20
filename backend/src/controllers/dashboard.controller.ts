import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';
import { ForbiddenError } from '../utils/errors';

const PRIVILEGED_ROLES = ['admin'];

const requirePrivileged = (req: AuthRequest) => {
  if (!PRIVILEGED_ROLES.includes(req.user!.role)) {
    throw new ForbiddenError('Only admins can view the analytics dashboard');
  }
};

export class DashboardController {
  async getOverview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const data = await dashboardService.getOverview(range as string);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const data = await dashboardService.getActivityTimeline(range as string);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }
  

  async getTopWorkspaces(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const data = await dashboardService.getTopWorkspaces();
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const data = await dashboardService.getSummaryReport(range as string);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const csv = await dashboardService.exportReportCsv(range as string);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="roleguard-report.csv"');
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  async exportJson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const data = await dashboardService.exportReportJson(range as string);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="roleguard-report.json"');
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async exportPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      requirePrivileged(req);
      const { range } = req.query;
      const pdfBuffer = await dashboardService.exportReportPdf(range as string);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="roleguard-report.pdf"');
      res.status(200).send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();