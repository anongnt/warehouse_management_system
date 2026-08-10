import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadProductImage } from '../middlewares/upload.middleware';
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
router.post('/', uploadProductImage, createProductValidation, ProductController.create);
router.put('/:id', uploadProductImage, updateProductValidation, ProductController.update);
router.delete('/:id', productIdValidation, ProductController.delete);

export default router;
