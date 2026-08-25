import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import {
  createReceiptValidation,
  createIssueValidation,
  createAdjustmentValidation,
  cancelDocumentValidation,
  stockBalanceListValidation,
  stockMovementListValidation,
  productIdParamValidation,
  documentIdValidation,
} from '../validators/stock.validator';

const router = Router();

// All stock routes require authentication
router.use(authenticate);

router.post('/receipts', createReceiptValidation, StockController.createReceipt);
router.post('/issues', createIssueValidation, StockController.createIssue);
router.post('/adjustments', requireAdmin, createAdjustmentValidation, StockController.createAdjustment);

// Static path before the parameterised one
router.get('/balances', stockBalanceListValidation, StockController.findBalances);
router.get('/balances/:productId', productIdParamValidation, StockController.findBalanceByProductId);

router.get('/movements', stockMovementListValidation, StockController.findMovements);

// The ledger is append-only: mutating a movement is always rejected with 403
router.put('/movements/:id', StockController.rejectMutation);
router.patch('/movements/:id', StockController.rejectMutation);
router.delete('/movements/:id', StockController.rejectMutation);

// More specific route first so /:id does not swallow /:id/cancel
router.post('/documents/:id/cancel', requireAdmin, cancelDocumentValidation, StockController.cancelDocument);
router.get('/documents/:id', documentIdValidation, StockController.findDocumentById);

export default router;
