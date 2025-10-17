import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { 
  authenticateToken, 
  requireVerification,
  authLimiter,
  registerLimiter,
  passwordResetLimiter 
} from '../middlewares';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

// Rotas públicas
router.post('/register', 
  registerLimiter,
  AuthController.registerValidation,
  handleValidationErrors,
  AuthController.register
);

router.post('/login', 
  authLimiter,
  AuthController.loginValidation,
  handleValidationErrors,
  AuthController.login
);

router.post('/refresh-token', 
  AuthController.refreshToken
);

router.get('/verify-email/:token', 
  AuthController.verifyEmail
);

router.post('/request-password-reset', 
  passwordResetLimiter,
  AuthController.resetPasswordValidation,
  handleValidationErrors,
  AuthController.requestPasswordReset
);

router.post('/reset-password', 
  AuthController.newPasswordValidation,
  handleValidationErrors,
  AuthController.resetPassword
);

// Rotas protegidas
router.post('/logout', 
  authenticateToken,
  AuthController.logout
);

router.get('/profile', 
  authenticateToken,
  AuthController.getProfile
);

router.post('/change-password', 
  authenticateToken,
  requireVerification,
  AuthController.changePasswordValidation,
  handleValidationErrors,
  AuthController.changePassword
);

export default router;

