import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/summary', DashboardController.getSummary);
router.get('/categories', DashboardController.getCategoryDistribution);
router.get('/low-stock', DashboardController.getLowStockProducts);
router.get('/recent-products', DashboardController.getRecentProducts);

export default router;
