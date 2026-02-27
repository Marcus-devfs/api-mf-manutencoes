import { Router } from 'express';
import { PaymentMethodController } from '../controllers/paymentMethodController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', PaymentMethodController.list);
router.post('/', PaymentMethodController.create);
router.delete('/:id', PaymentMethodController.delete);
router.patch('/:id/default', PaymentMethodController.setDefault);

export default router;
