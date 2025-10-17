import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
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

// Rotas públicas (com autenticação)
router.get('/available', 
  requireProfessional,
  validatePagination,
  ServiceController.getAvailableServices
);

router.get('/category/:category', 
  validatePagination,
  ServiceController.getServicesByCategory
);

router.get('/search', 
  validatePagination,
  ServiceController.searchServices
);

router.get('/nearby', 
  requireProfessional,
  validatePagination,
  ServiceController.getServicesNearProfessional
);

router.get('/:serviceId', 
  ServiceController.getServiceById
);

router.get('/:serviceId/stats', 
  ServiceController.getServiceStats
);

// Rotas para clientes
router.post('/', 
  requireClient,
  ServiceController.createServiceValidation,
  handleValidationErrors,
  ServiceController.createService
);

router.get('/client/my-services', 
  requireClient,
  validatePagination,
  ServiceController.getClientServices
);

router.put('/:serviceId', 
  requireClient,
  ServiceController.updateServiceValidation,
  handleValidationErrors,
  ServiceController.updateService
);

router.patch('/:serviceId/cancel', 
  requireClient,
  ServiceController.cancelService
);

router.patch('/:serviceId/complete', 
  requireClient,
  ServiceController.completeService
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  validatePagination,
  ServiceController.getAllServices
);

router.get('/admin/stats/overview', 
  requireAdmin,
  ServiceController.getGeneralServiceStats
);

export default router;
