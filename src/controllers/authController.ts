import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/authService';
import { asyncHandler, badRequest, unauthorized } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class AuthController {
  // Validações para registro
  static registerValidation = [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nome deve ter entre 2 e 50 caracteres'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    body('phone')
      .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
      .withMessage('Telefone deve estar no formato (XX) XXXXX-XXXX'),
    body('role')
      .isIn(['client', 'professional'])
      .withMessage('Role deve ser "client" ou "professional"'),
  ];

  // Validações para login
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória'),
  ];

  // Validações para reset de senha
  static resetPasswordValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
  ];

  // Validações para nova senha
  static newPasswordValidation = [
    body('token')
      .notEmpty()
      .withMessage('Token é obrigatório'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  ];

  // Validações para alterar senha
  static changePasswordValidation = [
    body('currentPassword')
      .notEmpty()
      .withMessage('Senha atual é obrigatória'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter pelo menos 6 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  ];

  // Registrar usuário
  static register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, phone, role } = req.body;

    const result = await AuthService.register({
      name,
      email,
      password,
      phone,
      role,
    });

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  });

  // Login
  static login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, pushToken, platform } = req.body;

    const result = await AuthService.login(email, password, pushToken, platform);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  });

  // Refresh token
  static refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw badRequest('Refresh token é obrigatório');
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: { tokens },
    });
  });

  // Verificar email
  static verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    const user = await AuthService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verificado com sucesso',
      data: { user },
    });
  });

  // Solicitar reset de senha
  static requestPasswordReset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const result = await AuthService.requestPasswordReset(email);

    res.json({
      success: true,
      message: result.message,
    });
  });

  // Reset de senha
  static resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token, password } = req.body;

    const user = await AuthService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
      data: { user },
    });
  });

  // Alterar senha
  static changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user._id;

    const user = await AuthService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso',
      data: { user },
    });
  });

  // Logout (invalidar token)
  static logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Em uma implementação mais robusta, você manteria uma blacklist de tokens
    // Por enquanto, apenas retornamos sucesso
    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  });

  // Obter perfil do usuário autenticado
  static getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    res.json({
      success: true,
      message: 'Perfil obtido com sucesso',
      data: { user },
    });
  });
}

