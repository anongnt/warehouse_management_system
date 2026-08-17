import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getSummary();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getCategoryDistribution();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getLowStockProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getLowStockProducts();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getRecentProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getRecentProducts();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
