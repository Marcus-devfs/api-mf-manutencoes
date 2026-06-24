import { Router } from 'express';
import { body } from 'express-validator';
import adminController from '../controllers/AdminController';
import { authenticateToken, requireAdmin } from '../middlewares';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

const refundValidation = [
    body('reason')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Motivo deve ter entre 10 e 200 caracteres'),
];

const cancelServiceValidation = [
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Motivo deve ter no máximo 500 caracteres'),
];

router.use(authenticateToken, requireAdmin);

router.get('/dashboard', adminController.getDashboardStats);

router.get('/services', adminController.getServices);
router.get('/services/:id', adminController.getServiceById);
router.patch(
    '/services/:id/cancel',
    cancelServiceValidation,
    handleValidationErrors,
    adminController.cancelService
);

router.get('/quotes', adminController.getQuotes);
router.get('/quotes/:id', adminController.getQuoteById);

router.get('/payments', adminController.getPayments);
router.get('/payments/stats', adminController.getPaymentStats);
router.get('/payments/:id', adminController.getPaymentById);
router.post(
    '/payments/:id/refund',
    refundValidation,
    handleValidationErrors,
    adminController.refundPayment
);

router.get('/withdrawals', adminController.getWithdrawals);

router.get('/users/:id/quotes', adminController.getUserQuotes);
router.get('/users/:id/services', adminController.getUserServices);

export default router;
