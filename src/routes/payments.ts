import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { 
  authenticateToken, 
  requireVerification,
  requireClient,
  requireProfessional,
  requireClientOrProfessional,
  requireAdmin,
  apiLimiter 
} from '../middlewares';
import { handleValidationErrors, validatePagination } from '../middlewares/validation';

const router = Router();

// Aplicar rate limiting e autenticação em todas as rotas
router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Rotas para métodos de pagamento
router.get('/methods', 
  PaymentController.getPaymentMethods
);

// Rotas para processar pagamentos
router.post('/stripe', 
  requireClient,
  PaymentController.stripePaymentValidation,
  handleValidationErrors,
  PaymentController.processStripePayment
);

router.post('/pix', 
  requireClient,
  PaymentController.pixPaymentValidation,
  handleValidationErrors,
  PaymentController.processPixPayment
);

router.post('/pix/confirm', 
  PaymentController.confirmPaymentValidation,
  handleValidationErrors,
  PaymentController.confirmPixPayment
);

router.post('/bank-transfer', 
  requireClient,
  PaymentController.bankTransferValidation,
  handleValidationErrors,
  PaymentController.processBankTransfer
);

router.post('/bank-transfer/confirm', 
  PaymentController.confirmPaymentValidation,
  handleValidationErrors,
  PaymentController.confirmBankTransfer
);

// Webhook do Stripe
router.post('/stripe/webhook', 
  PaymentController.stripeWebhook
);

// Rotas para clientes
router.get('/client/my-payments', 
  requireClient,
  validatePagination,
  PaymentController.getClientPayments
);

// Rotas para profissionais
router.get('/professional/my-payments', 
  requireProfessional,
  validatePagination,
  PaymentController.getProfessionalPayments
);

// Rotas compartilhadas
router.get('/:paymentId', 
  requireClientOrProfessional,
  PaymentController.getPaymentById
);

router.post('/:paymentId/refund', 
  requireClientOrProfessional,
  PaymentController.refundValidation,
  handleValidationErrors,
  PaymentController.processRefund
);

router.get('/stats/overview', 
  requireClientOrProfessional,
  PaymentController.getPaymentStats
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  validatePagination,
  PaymentController.getAllPayments
);

router.get('/admin/stats/overview', 
  requireAdmin,
  PaymentController.getGeneralPaymentStats
);

export default router;

