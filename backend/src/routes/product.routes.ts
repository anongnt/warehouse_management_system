import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createProductValidation,
  updateProductValidation,
  productListValidation,
  productIdValidation,
} from '../validators/product.validator';

const router = Router();

// All routes require authentication (no admin requirement)
router.use(authenticate);

router.get('/', productListValidation, ProductController.findAll);
router.get('/:id', productIdValidation, ProductController.findById);
router.post('/', createProductValidation, ProductController.create);
router.put('/:id', updateProductValidation, ProductController.update);
router.delete('/:id', productIdValidation, ProductController.delete);

export default router;
