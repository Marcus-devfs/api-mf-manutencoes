import { Request, Response } from 'express';
import { body } from 'express-validator';
import { ModerationService } from '../services/moderationService';
import { asyncHandler } from '../middlewares/errorHandler';

export class ModerationController {
  static reportValidation = [
    body('reportedUserId')
      .notEmpty()
      .withMessage('ID do usuário denunciado é obrigatório'),
    body('reason')
      .isIn(['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'scam', 'other'])
      .withMessage('Motivo inválido'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    body('chatId').optional().isString(),
    body('messageId').optional().isString(),
  ];

  static blockValidation = [
    body('userId')
      .notEmpty()
      .withMessage('ID do usuário a bloquear é obrigatório'),
  ];

  static reportUser = asyncHandler(async (req: Request, res: Response) => {
    const reporterId = (req as any).user._id.toString();
    const { reportedUserId, reason, description, chatId, messageId } = req.body;

    const report = await ModerationService.reportUser({
      reporterId,
      reportedUserId,
      reason,
      description,
      chatId,
      messageId,
    });

    res.status(201).json({
      success: true,
      message: 'Denúncia enviada com sucesso. Nossa equipe irá analisar.',
      data: { report },
    });
  });

  static blockUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const { userId: targetUserId } = req.body;

    const blockedUsers = await ModerationService.blockUser(userId, targetUserId);

    res.json({
      success: true,
      message: 'Usuário bloqueado com sucesso',
      data: { blockedUsers },
    });
  });

  static unblockUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const { userId: targetUserId } = req.params;

    const blockedUsers = await ModerationService.unblockUser(userId, targetUserId);

    res.json({
      success: true,
      message: 'Usuário desbloqueado com sucesso',
      data: { blockedUsers },
    });
  });

  static getBlockedUsers = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id.toString();
    const blockedUsers = await ModerationService.getBlockedUsers(userId);

    res.json({
      success: true,
      message: 'Lista de bloqueados',
      data: { blockedUsers },
    });
  });
}
