import { Router } from 'express';
import { UserController } from '../controllers/userController';
import {
  authenticateToken,
  requireVerification,
  requireAdmin,
  requireClientOrProfessional,
  apiLimiter,
  requireProfessional
} from '../middlewares';
import { handleValidationErrors, validatePagination } from '../middlewares/validation';

const router = Router();

// Aplicar rate limiting e autenticação em todas as rotas
router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Rotas para perfil do usuário
router.get('/profile',
  UserController.getUserById
);

router.put('/profile',
  UserController.updateProfileValidation,
  handleValidationErrors,
  UserController.updateProfile
);

router.delete('/profile',
  UserController.deactivateAccount
);

// Rotas para endereços
router.get('/addresses',
  UserController.getUserAddresses
);

router.post('/addresses',
  UserController.addressValidation,
  handleValidationErrors,
  UserController.addAddress
);

router.put('/addresses/:addressId',
  UserController.addressValidation,
  handleValidationErrors,
  UserController.updateAddress
);

router.delete('/addresses/:addressId',
  UserController.removeAddress
);

router.patch('/addresses/:addressId/default',
  UserController.setDefaultAddress
);

// Rotas para perfil profissional
router.get('/professional-profile',
  UserController.getProfessionalProfile
);

router.post('/professional-profile',
  UserController.professionalProfileValidation,
  handleValidationErrors,
  UserController.createProfessionalProfile
);

router.put('/professional-profile',
  UserController.professionalProfileValidation,
  handleValidationErrors,
  UserController.updateProfessionalProfile
);

router.post('/financial-profile',
  requireProfessional,
  UserController.completeFinancialProfile
);

// Rotas para buscar profissionais
router.get('/professionals/nearby',
  UserController.getNearbyProfessionals
);

router.get('/professionals/specialty/:specialty',
  UserController.getProfessionalsBySpecialty
);

// Rotas para avaliações
router.post('/professionals/:professionalId/rate',
  UserController.rateProfessional
);

router.get(
  '/payment-account-status',
  requireProfessional, // Auth já foi aplicado globalmente mas mantemos requireProfessional
  UserController.getPaymentAccountStatus
);

// Rotas para buscar usuários específicos
router.get('/:userId',
  UserController.getUserById
);

// Rotas administrativas
router.get('/',
  requireAdmin,
  validatePagination,
  UserController.getUsers
);

router.get('/stats/overview',
  requireAdmin,
  UserController.getUserStats
);

router.patch('/:userId/reactivate',
  requireAdmin,
  UserController.reactivateAccount
);



export default router;

