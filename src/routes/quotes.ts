import { Router } from 'express';
import { QuoteController } from '../controllers/quoteController';
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

// Rotas para profissionais
router.post('/', 
  requireProfessional,
  QuoteController.createQuoteValidation,
  handleValidationErrors,
  QuoteController.createQuote
);

router.get('/professional/my-quotes', 
  requireProfessional,
  validatePagination,
  QuoteController.getProfessionalQuotes
);

router.put('/:quoteId', 
  requireProfessional,
  QuoteController.updateQuoteValidation,
  handleValidationErrors,
  QuoteController.updateQuote
);

router.delete('/:quoteId', 
  requireProfessional,
  QuoteController.deleteQuote
);

router.get('/professional/expiring', 
  requireProfessional,
  QuoteController.getExpiringQuotes
);

// Rotas para clientes
router.get('/client/my-quotes', 
  requireClient,
  validatePagination,
  QuoteController.getClientQuotes
);

router.patch('/:quoteId/accept', 
  requireClient,
  QuoteController.acceptQuote
);

router.patch('/:quoteId/reject', 
  requireClient,
  QuoteController.rejectQuote
);

// Rotas para pagamento
router.post('/:quoteId/payment', 
  requireClient,
  QuoteController.processPayment
);

// Rotas compartilhadas
router.get('/:quoteId', 
  requireClientOrProfessional,
  QuoteController.getQuoteById
);

router.get('/search/advanced', 
  requireClientOrProfessional,
  validatePagination,
  QuoteController.searchQuotes
);

router.get('/stats/overview', 
  requireClientOrProfessional,
  QuoteController.getQuoteStats
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  validatePagination,
  QuoteController.getAllQuotes
);

router.get('/admin/stats/overview', 
  requireAdmin,
  QuoteController.getGeneralQuoteStats
);

export default router;

