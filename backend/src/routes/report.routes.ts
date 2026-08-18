import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { ExpenseSummaryController } from '../controllers/expense-summary.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  inventoryReportValidation,
  categoryReportValidation,
  lowStockReportValidation,
  stockValueReportValidation,
} from '../validators/report.validator';
import { expenseSummaryValidation } from '../validators/expense-summary.validator';

const router = Router();

// All report routes require authentication
router.use(authenticate);

router.get('/inventory', inventoryReportValidation, ReportController.generateInventoryReport);
router.get('/category', categoryReportValidation, ReportController.generateCategoryReport);
router.get('/low-stock', lowStockReportValidation, ReportController.generateLowStockReport);
router.get('/stock-value', stockValueReportValidation, ReportController.generateStockValueReport);
router.get('/expense-summary', expenseSummaryValidation, ExpenseSummaryController.getExpenseSummary);

export default router;
