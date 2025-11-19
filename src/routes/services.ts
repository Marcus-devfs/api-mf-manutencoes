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

// Rotas para profissionais
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

router.patch('/:serviceId/start', 
  requireProfessional,
  ServiceController.startService
);

router.patch('/:serviceId/location', 
  requireProfessional,
  ServiceController.updateLocation
);

router.patch('/:serviceId/arrived', 
  requireProfessional,
  ServiceController.markArrived
);

router.patch('/:serviceId/regenerate-code', 
  requireProfessional,
  ServiceController.regenerateVerificationCode
);

router.patch('/:serviceId/verify-code', 
  requireProfessional,
  ServiceController.verifyCodeAndStart
);

router.patch('/:serviceId/sign', 
  requireClient,
  ServiceController.signService
);

router.patch('/:serviceId/complete', 
  requireProfessional,
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

