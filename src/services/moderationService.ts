import { User, Chat, ChatMessage, Report } from '../models';
import { IReport } from '../models/Report';
import { notFound, badRequest, forbidden } from '../middlewares/errorHandler';
import { EmailService } from './emailService';

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Assédio / abuso',
  hate_speech: 'Discurso de ódio',
  inappropriate_content: 'Conteúdo inadequado',
  scam: 'Golpe / fraude',
  other: 'Outro',
};

export class ModerationService {
  static async blockUser(userId: string, targetUserId: string): Promise<string[]> {
    if (userId === targetUserId) {
      throw badRequest('Você não pode bloquear a si mesmo');
    }

    const [user, target] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId),
    ]);

    if (!user) throw notFound('Usuário não encontrado');
    if (!target || !target.isActive) throw notFound('Usuário a bloquear não encontrado');

    const blocked = new Set(user.blockedUsers || []);
    blocked.add(targetUserId);
    user.blockedUsers = Array.from(blocked);
    await user.save();

    // Desativa chats entre os dois usuários imediatamente
    await Chat.updateMany(
      {
        participants: { $all: [userId, targetUserId] },
        isActive: true,
      },
      { isActive: false }
    );

    return user.blockedUsers;
  }

  static async unblockUser(userId: string, targetUserId: string): Promise<string[]> {
    const user = await User.findById(userId);
    if (!user) throw notFound('Usuário não encontrado');

    user.blockedUsers = (user.blockedUsers || []).filter((id) => id !== targetUserId);
    await user.save();

    return user.blockedUsers;
  }

  static async isBlockedBetween(userId1: string, userId2: string): Promise<boolean> {
    const users = await User.find({
      _id: { $in: [userId1, userId2] },
    }).select('blockedUsers');

    return users.some((u) => (u.blockedUsers || []).includes(
      u._id.toString() === userId1 ? userId2 : userId1
    ));
  }

  static async getBlockedUsers(userId: string) {
    const user = await User.findById(userId).select('blockedUsers');
    if (!user) throw notFound('Usuário não encontrado');

    const blockedIds = user.blockedUsers || [];
    if (blockedIds.length === 0) return [];

    return User.find({ _id: { $in: blockedIds } })
      .select('name email avatar role')
      .lean();
  }

  static async reportUser(params: {
    reporterId: string;
    reportedUserId: string;
    reason: string;
    description?: string;
    chatId?: string;
    messageId?: string;
  }): Promise<IReport> {
    const { reporterId, reportedUserId, reason, description, chatId, messageId } = params;

    if (reporterId === reportedUserId) {
      throw badRequest('Você não pode denunciar a si mesmo');
    }

    const reported = await User.findById(reportedUserId);
    if (!reported) throw notFound('Usuário denunciado não encontrado');

    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(reporterId)) {
        throw forbidden('Você não tem acesso a este chat');
      }
    }

    const report = await Report.create({
      reporterId,
      reportedUserId,
      reason,
      description,
      chatId,
      messageId,
      status: 'pending',
    });

    // Notifica o desenvolvedor sobre conteúdo inadequado
    try {
      const reporter = await User.findById(reporterId).select('name email');
      await EmailService.sendModerationReportEmail({
        reporterName: reporter?.name || 'Usuário',
        reporterEmail: reporter?.email || '',
        reportedName: reported.name,
        reportedEmail: reported.email,
        reason: REPORT_REASON_LABELS[reason] || reason,
        description,
        chatId,
        reportId: report._id.toString(),
      });
    } catch (error) {
      console.error('Falha ao notificar moderação:', error);
    }

    return report;
  }

  static async hideMessageForReporter(messageId: string, reporterId: string): Promise<void> {
    if (!messageId) return;
    // Soft approach: mark message as empty for moderation audit trail remains in Report
    const message = await ChatMessage.findById(messageId);
    if (!message) return;
    if (message.receiverId === reporterId || message.senderId === reporterId) {
      // Keep message for admin review; UI will filter blocked content client-side after block
    }
  }
}
