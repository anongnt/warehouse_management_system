import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { updateUserValidation, userListValidation } from '../validators/user.validator';

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/', userListValidation, UserController.findAll);
router.get('/:id', UserController.findById);
router.put('/:id', updateUserValidation, UserController.update);
router.delete('/:id', UserController.delete);

export default router;
