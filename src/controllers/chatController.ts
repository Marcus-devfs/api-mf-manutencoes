import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { ChatService } from '../services/chatService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class ChatController {
  // Validações para enviar mensagem
  static sendMessageValidation = [
    body('chatId')
      .isMongoId()
      .withMessage('ID do chat inválido'),
    body('receiverId')
      .isMongoId()
      .withMessage('ID do destinatário inválido'),
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Mensagem deve ter entre 1 e 1000 caracteres'),
    body('type')
      .optional()
      .isIn(['text', 'image', 'file'])
      .withMessage('Tipo deve ser text, image ou file'),
    body('fileUrl')
      .optional()
      .isURL()
      .withMessage('URL do arquivo inválida'),
  ];

  // Validações para editar mensagem
  static editMessageValidation = [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Mensagem deve ter entre 1 e 1000 caracteres'),
  ];

  // Criar ou buscar chat
  static getOrCreateChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId, userId2 } = req.params;
    const userId1 = (req as any).user._id;

    const chat = await ChatService.getOrCreateChat(serviceId, userId1, userId2);

    res.json({
      success: true,
      message: 'Chat obtido com sucesso',
      data: { chat },
    });
  });

  // Enviar mensagem
  static sendMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const senderId = (req as any).user._id;
    const { chatId, receiverId, message, type, fileUrl } = req.body;

    const chatMessage = await ChatService.sendMessage({
      chatId,
      senderId,
      receiverId,
      message,
      type,
      fileUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { message: chatMessage },
    });
  });

  // Buscar mensagens do chat
  static getChatMessages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;
    const { page, limit, before } = req.query;

    const result = await ChatService.getChatMessages(chatId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      before: before ? new Date(before as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Mensagens encontradas',
      data: result,
    });
  });

  // Marcar mensagens como lidas
  static markMessagesAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;

    await ChatService.markMessagesAsRead(chatId, userId);

    res.json({
      success: true,
      message: 'Mensagens marcadas como lidas',
    });
  });

  // Buscar chats do usuário
  static getUserChats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const { page, limit } = req.query;

    const result = await ChatService.getUserChats(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Chats encontrados',
      data: result,
    });
  });

  // Buscar chat específico
  static getChatById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;

    const chat = await ChatService.getChatById(chatId, userId);

    res.json({
      success: true,
      message: 'Chat encontrado',
      data: { chat },
    });
  });

  // Obter contagem de mensagens não lidas
  static getUnreadCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const count = await ChatService.getUnreadCount(userId);

    res.json({
      success: true,
      message: 'Contagem obtida',
      data: { unreadCount: count },
    });
  });

  // Obter contagem de mensagens não lidas por chat
  static getUnreadCountByChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;

    const count = await ChatService.getUnreadCountByChat(chatId, userId);

    res.json({
      success: true,
      message: 'Contagem obtida',
      data: { unreadCount: count },
    });
  });

  // Editar mensagem
  static editMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;
    const userId = (req as any).user._id;
    const { message } = req.body;

    const chatMessage = await ChatService.editMessage(messageId, userId, message);

    res.json({
      success: true,
      message: 'Mensagem editada com sucesso',
      data: { message: chatMessage },
    });
  });

  // Deletar mensagem
  static deleteMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { messageId } = req.params;
    const userId = (req as any).user._id;

    await ChatService.deleteMessage(messageId, userId);

    res.json({
      success: true,
      message: 'Mensagem deletada com sucesso',
    });
  });

  // Arquivar chat
  static archiveChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;

    const chat = await ChatService.archiveChat(chatId, userId);

    res.json({
      success: true,
      message: 'Chat arquivado com sucesso',
      data: { chat },
    });
  });

  // Reativar chat
  static unarchiveChat = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;

    const chat = await ChatService.unarchiveChat(chatId, userId);

    res.json({
      success: true,
      message: 'Chat reativado com sucesso',
      data: { chat },
    });
  });

  // Buscar mensagens com filtros
  static searchMessages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { chatId } = req.params;
    const userId = (req as any).user._id;
    const { query, page, limit } = req.query;

    if (!query) {
      throw badRequest('Query de busca é obrigatória');
    }

    const result = await ChatService.searchMessages(chatId, userId, query as string, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Busca realizada com sucesso',
      data: result,
    });
  });

  // Obter estatísticas do chat
  static getChatStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const stats = await ChatService.getChatStats(userId);

    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: { stats },
    });
  });

  // Buscar todos os chats (admin)
  static getAllChats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, isActive, serviceId } = req.query;

    // Implementar busca de todos os chats para admin
    res.json({
      success: true,
      message: 'Chats encontrados',
      data: {
        chats: [],
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 10,
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Obter estatísticas gerais de chat (admin)
  static getGeneralChatStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas gerais
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalChats: 0,
        activeChats: 0,
        totalMessages: 0,
        averageMessagesPerChat: 0,
        messagesByDay: {},
      },
    });
  });
}

