import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { PushNotificationService } from '../services/pushNotificationService';
import { asyncHandler, badRequest } from '../middlewares/errorHandler';

export class PushNotificationController {
  // Validações para registrar token
  static registerTokenValidation = [
    body('token')
      .notEmpty()
      .withMessage('Token é obrigatório'),
    body('platform')
      .isIn(['ios', 'android', 'web'])
      .withMessage('Plataforma deve ser ios, android ou web'),
    body('deviceInfo')
      .optional()
      .isObject()
      .withMessage('Informações do dispositivo devem ser um objeto')
  ];

  // Validações para desativar token
  static deactivateTokenValidation = [
    param('token')
      .notEmpty()
      .withMessage('Token é obrigatório')
  ];

  // Registrar token de push
  static registerToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token, platform, deviceInfo } = req.body;
    const userId = (req as any).user._id;

    const pushToken = await PushNotificationService.registerToken(
      userId,
      token,
      platform,
      deviceInfo
    );

    res.json({
      success: true,
      message: 'Token de push registrado com sucesso',
      data: { pushToken }
    });
  });

  // Desativar token
  static deactivateToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    await PushNotificationService.deactivateToken(token);

    res.json({
      success: true,
      message: 'Token desativado com sucesso'
    });
  });

  // Desativar todos os tokens do usuário
  static deactivateUserTokens = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    await PushNotificationService.deactivateUserTokens(userId);

    res.json({
      success: true,
      message: 'Todos os tokens do usuário foram desativados'
    });
  });

  // Enviar notificação de teste
  static sendTestNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const { title, body } = req.body;

    if (!title || !body) {
      throw badRequest('Título e corpo da notificação são obrigatórios');
    }

    const result = await PushNotificationService.sendToUser(
      userId,
      title,
      body,
      { type: 'test' }
    );

    res.json({
      success: true,
      message: 'Notificação de teste enviada',
      data: { result }
    });
  });

  // Obter informações dos tokens do usuário
  static getUserTokens = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const { PushToken } = require('../models/PushToken');
    const tokens = await PushToken.findActiveTokensByUserId(userId);

    res.json({
      success: true,
      message: 'Tokens do usuário obtidos com sucesso',
      data: { tokens }
    });
  });
}
