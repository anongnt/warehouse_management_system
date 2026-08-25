import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StockService } from '../services/stock.service';
import { ForbiddenError } from '../utils/errors';
import {
  StockItemInput,
  AdjustmentItemInput,
  MovementType,
} from '../types';

const stockService = new StockService();

// Shared: write the 400 envelope for express-validator failures.
// `details` keys are the validator paths (e.g. `items[2].quantity`) so the
// client can map each error back to a row and a field.
function respondValidationError(req: Request, res: Response, message: string): boolean {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return false;
  }

  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: errors.array().map(e => ({ [e.type === 'field' ? (e as any).path : 'general']: e.msg })),
    },
  });
  return true;
}

function toQuantityItems(items: unknown): StockItemInput[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item: any) => ({
    productId: item.productId,
    quantity: Number(item.quantity),
    ...(item.unitCost !== undefined && item.unitCost !== null && item.unitCost !== ''
      ? { unitCost: Number(item.unitCost) }
      : {}),
  }));
}

function toAdjustmentItems(items: unknown): AdjustmentItemInput[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item: any) => ({
    productId: item.productId,
    countedQuantity: Number(item.countedQuantity),
    reason: item.reason,
  }));
}

export class StockController {
  // POST /api/stock/receipts
  static async createReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const { documentDate, note, items } = req.body;
      const userId = (req as any).user.userId;

      const document = await stockService.createReceipt(
        { documentDate, note, items: toQuantityItems(items) },
        userId
      );

      res.status(201).json({
        success: true,
        data: document,
        message: 'บันทึกรับสินค้าเข้าสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/stock/issues
  static async createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const { documentDate, note, items } = req.body;
      const userId = (req as any).user.userId;

      const document = await stockService.createIssue(
        { documentDate, note, items: toQuantityItems(items) },
        userId
      );

      res.status(201).json({
        success: true,
        data: document,
        message: 'บันทึกจ่ายสินค้าออกสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/stock/adjustments (admin)
  static async createAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const { documentDate, note, items } = req.body;
      const userId = (req as any).user.userId;

      const document = await stockService.createAdjustment(
        { documentDate, note, items: toAdjustmentItems(items) },
        userId
      );

      res.status(201).json({
        success: true,
        data: document,
        message: 'ปรับยอดสินค้าสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/stock/documents/:id/cancel (admin)
  static async cancelDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.userId;

      const result = await stockService.cancelDocument(id, { reason }, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'ยกเลิกเอกสารสำเร็จ',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stock/documents/:id
  static async findDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'รูปแบบ ID ไม่ถูกต้อง')) return;

      const document = await stockService.findDocumentById(req.params.id);

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stock/balances
  static async findBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || undefined;
      const categoryId = (req.query.categoryId as string) || undefined;
      const lowStock = req.query.lowStock === 'true' || req.query.lowStock === '1';
      const threshold =
        req.query.threshold !== undefined ? parseInt(req.query.threshold as string) : undefined;

      const result = await stockService.findBalances({
        page,
        limit,
        search,
        categoryId,
        lowStock,
        threshold: isNaN(threshold as number) ? undefined : threshold,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stock/balances/:productId
  static async findBalanceByProductId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'รูปแบบ productId ไม่ถูกต้อง')) return;

      const balance = await stockService.findBalanceByProductId(req.params.productId);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/stock/movements
  static async findMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (respondValidationError(req, res, 'ข้อมูลไม่ถูกต้อง')) return;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const productId = (req.query.productId as string) || undefined;
      const movementType = (req.query.movementType as MovementType) || undefined;
      const startDate = (req.query.startDate as string) || undefined;
      const endDate = (req.query.endDate as string) || undefined;

      const result = await stockService.findMovements({
        page,
        limit,
        productId,
        movementType,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT / PATCH / DELETE /api/stock/movements/:id - the ledger is append-only
  static async rejectMutation(req: Request, res: Response, next: NextFunction): Promise<void> {
    next(new ForbiddenError('รายการความเคลื่อนไหวแก้ไขหรือลบไม่ได้ กรุณายกเลิกเอกสารแทน'));
  }
}
