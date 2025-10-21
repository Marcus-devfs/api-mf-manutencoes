import { Router } from 'express';
import { PushNotificationController } from '../controllers/pushNotificationController';
import { requireVerification, requireClientOrProfessional } from '../middlewares/auth';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(requireVerification);

// Registrar token de push
router.post(
  '/register',
  PushNotificationController.registerTokenValidation,
  handleValidationErrors,
  PushNotificationController.registerToken
);

// Desativar token específico
router.delete(
  '/token/:token',
  PushNotificationController.deactivateTokenValidation,
  handleValidationErrors,
  PushNotificationController.deactivateToken
);

// Desativar todos os tokens do usuário
router.delete(
  '/user-tokens',
  requireClientOrProfessional,
  PushNotificationController.deactivateUserTokens
);

// Enviar notificação de teste
router.post(
  '/test',
  requireClientOrProfessional,
  [
    require('express-validator').body('title')
      .notEmpty()
      .withMessage('Título é obrigatório'),
    require('express-validator').body('body')
      .notEmpty()
      .withMessage('Corpo é obrigatório')
  ],
  handleValidationErrors,
  PushNotificationController.sendTestNotification
);

// Obter tokens do usuário
router.get(
  '/user-tokens',
  requireClientOrProfessional,
  PushNotificationController.getUserTokens
);

export default router;
