import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { NotificationService } from '../services/notificationService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class NotificationController {
  // Validações para criar notificação
  static createNotificationValidation = [
    body('userId')
      .isMongoId()
      .withMessage('ID do usuário inválido'),
    body('title')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Título deve ter entre 2 e 100 caracteres'),
    body('message')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Mensagem deve ter entre 5 e 500 caracteres'),
    body('type')
      .isIn(['quote_received', 'quote_accepted', 'quote_rejected', 'payment_received', 'service_completed', 'chat_message'])
      .withMessage('Tipo de notificação inválido'),
  ];

  // Buscar notificações do usuário
  static getUserNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const { page, limit, isRead, type } = req.query;

    const result = await NotificationService.getUserNotifications(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      isRead: isRead ? isRead === 'true' : undefined,
      type: type as string,
    });

    res.json({
      success: true,
      message: 'Notificações encontradas',
      data: result,
    });
  });

  // Marcar notificação como lida
  static markAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const userId = (req as any).user._id;

    const notification = await NotificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notificação marcada como lida',
      data: { notification },
    });
  });

  // Marcar todas as notificações como lidas
  static markAllAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    await NotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas',
    });
  });

  // Deletar notificação
  static deleteNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const userId = (req as any).user._id;

    await NotificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: 'Notificação deletada com sucesso',
    });
  });

  // Deletar todas as notificações lidas
  static deleteReadNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    await NotificationService.deleteReadNotifications(userId);

    res.json({
      success: true,
      message: 'Notificações lidas deletadas com sucesso',
    });
  });

  // Obter contagem de notificações não lidas
  static getUnreadCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      message: 'Contagem obtida',
      data: { unreadCount: count },
    });
  });

  // Buscar notificação por ID
  static getNotificationById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const userId = (req as any).user._id;

    const notification = await NotificationService.getNotificationById(notificationId, userId);

    res.json({
      success: true,
      message: 'Notificação encontrada',
      data: { notification },
    });
  });

  // Enviar notificação push
  static sendPushNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, title, message, data } = req.body;

    await NotificationService.sendPushNotification(userId, title, message, data);

    res.json({
      success: true,
      message: 'Notificação push enviada com sucesso',
    });
  });

  // Enviar notificação por email
  static sendEmailNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, title, message, data } = req.body;

    await NotificationService.sendEmailNotification(userId, title, message, data);

    res.json({
      success: true,
      message: 'Notificação por email enviada com sucesso',
    });
  });

  // Enviar notificação SMS
  static sendSmsNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, message, data } = req.body;

    await NotificationService.sendSmsNotification(userId, message, data);

    res.json({
      success: true,
      message: 'Notificação SMS enviada com sucesso',
    });
  });

  // Obter estatísticas de notificações
  static getNotificationStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const stats = await NotificationService.getNotificationStats(userId);

    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: { stats },
    });
  });

  // Buscar todas as notificações (admin)
  static getAllNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, type, isRead, userId } = req.query;

    // Implementar busca de todas as notificações para admin
    res.json({
      success: true,
      message: 'Notificações encontradas',
      data: {
        notifications: [],
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 10,
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Obter estatísticas gerais de notificações (admin)
  static getGeneralNotificationStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas gerais
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalNotifications: 0,
        unreadNotifications: 0,
        notificationsByType: {},
        notificationsByDay: {},
        averageNotificationsPerUser: 0,
      },
    });
  });

  // Criar notificação (admin)
  static createNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, title, message, type, data } = req.body;

    const notification = await NotificationService.createNotification(
      userId,
      title,
      message,
      type,
      data
    );

    res.status(201).json({
      success: true,
      message: 'Notificação criada com sucesso',
      data: { notification },
    });
  });

  // Enviar notificação em massa (admin)
  static sendBulkNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userIds, title, message, type, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw badRequest('Lista de usuários é obrigatória');
    }

    // Enviar notificação para cada usuário
    const promises = userIds.map(userId => 
      NotificationService.createNotification(userId, title, message, type, data)
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Notificação enviada para ${userIds.length} usuários`,
    });
  });
}

