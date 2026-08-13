import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createCategoryValidation,
  updateCategoryValidation,
  categoryListValidation,
  categoryIdValidation,
  updateCategoryStatusValidation,
} from '../validators/category.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', categoryListValidation, CategoryController.findAll);
router.get('/:id', categoryIdValidation, CategoryController.findById);
router.post('/', createCategoryValidation, CategoryController.create);
router.put('/:id', updateCategoryValidation, CategoryController.update);
router.patch('/:id/status', updateCategoryStatusValidation, CategoryController.updateStatus);
router.delete('/:id', categoryIdValidation, CategoryController.delete);

export default router;
