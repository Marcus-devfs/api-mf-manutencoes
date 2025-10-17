import { Notification, User } from '../models';
import { INotification } from '../types';
import { createError, notFound, badRequest } from '../middlewares/errorHandler';

export class NotificationService {
  // Criar notificação
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        type,
        data,
        isRead: false
      });

      await notification.save();
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Buscar notificações do usuário
  static async getUserNotifications(userId: string, options: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
  } = {}): Promise<{ notifications: INotification[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 20, isRead, type } = options;
      const skip = (page - 1) * limit;

      const filter: any = { userId };
      if (isRead !== undefined) filter.isRead = isRead;
      if (type) filter.type = type;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter)
      ]);

      return {
        notifications,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Marcar notificação como lida
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        throw notFound('Notificação não encontrada');
      }

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Marcar todas as notificações como lidas
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      throw error;
    }
  }

  // Deletar notificação
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
      });

      if (!notification) {
        throw notFound('Notificação não encontrada');
      }
    } catch (error) {
      throw error;
    }
  }

  // Deletar todas as notificações lidas
  static async deleteReadNotifications(userId: string): Promise<void> {
    try {
      await Notification.deleteMany({
        userId,
        isRead: true
      });
    } catch (error) {
      throw error;
    }
  }

  // Obter contagem de notificações não lidas
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false
      });

      return count;
    } catch (error) {
      throw error;
    }
  }

  // Buscar notificação por ID
  static async getNotificationById(notificationId: string, userId: string): Promise<INotification> {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId
      });

      if (!notification) {
        throw notFound('Notificação não encontrada');
      }

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Enviar notificação push (placeholder)
  static async sendPushNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    try {
      // Aqui você integraria com um serviço de push notifications como Firebase
      // Por enquanto, apenas criar a notificação no banco
      await this.createNotification(userId, title, message, 'push', data);
      
      console.log(`Push notification sent to user ${userId}: ${title} - ${message}`);
    } catch (error) {
      throw error;
    }
  }

  // Enviar notificação por email (placeholder)
  static async sendEmailNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw notFound('Usuário não encontrado');
      }

      // Aqui você integraria com um serviço de email como SendGrid ou AWS SES
      console.log(`Email notification sent to ${user.email}: ${title} - ${message}`);
      
      // Criar notificação no banco também
      await this.createNotification(userId, title, message, 'email', data);
    } catch (error) {
      throw error;
    }
  }

  // Enviar notificação SMS (placeholder)
  static async sendSmsNotification(userId: string, message: string, data?: any): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw notFound('Usuário não encontrado');
      }

      // Aqui você integraria com um serviço de SMS como Twilio
      console.log(`SMS notification sent to ${user.phone}: ${message}`);
      
      // Criar notificação no banco também
      await this.createNotification(userId, 'SMS', message, 'sms', data);
    } catch (error) {
      throw error;
    }
  }

  // Notificar novo orçamento
  static async notifyNewQuote(clientId: string, professionalName: string, serviceTitle: string, quoteId: string): Promise<void> {
    try {
      await this.createNotification(
        clientId,
        'Novo Orçamento Recebido',
        `${professionalName} enviou um orçamento para o serviço "${serviceTitle}"`,
        'quote_received',
        { quoteId, serviceTitle, professionalName }
      );
    } catch (error) {
      throw error;
    }
  }

  // Notificar orçamento aceito
  static async notifyQuoteAccepted(professionalId: string, clientName: string, serviceTitle: string, quoteId: string): Promise<void> {
    try {
      await this.createNotification(
        professionalId,
        'Orçamento Aceito',
        `${clientName} aceitou seu orçamento para o serviço "${serviceTitle}"`,
        'quote_accepted',
        { quoteId, serviceTitle, clientName }
      );
    } catch (error) {
      throw error;
    }
  }

  // Notificar orçamento rejeitado
  static async notifyQuoteRejected(professionalId: string, clientName: string, serviceTitle: string, quoteId: string): Promise<void> {
    try {
      await this.createNotification(
        professionalId,
        'Orçamento Rejeitado',
        `${clientName} rejeitou seu orçamento para o serviço "${serviceTitle}"`,
        'quote_rejected',
        { quoteId, serviceTitle, clientName }
      );
    } catch (error) {
      throw error;
    }
  }

  // Notificar pagamento recebido
  static async notifyPaymentReceived(professionalId: string, clientName: string, amount: number, quoteId: string): Promise<void> {
    try {
      await this.createNotification(
        professionalId,
        'Pagamento Recebido',
        `Você recebeu R$ ${amount.toFixed(2)} de ${clientName}`,
        'payment_received',
        { quoteId, amount, clientName }
      );
    } catch (error) {
      throw error;
    }
  }

  // Notificar serviço concluído
  static async notifyServiceCompleted(clientId: string, professionalName: string, serviceTitle: string, serviceId: string): Promise<void> {
    try {
      await this.createNotification(
        clientId,
        'Serviço Concluído',
        `${professionalName} concluiu o serviço "${serviceTitle}"`,
        'service_completed',
        { serviceId, serviceTitle, professionalName }
      );
    } catch (error) {
      throw error;
    }
  }

  // Notificar nova mensagem no chat
  static async notifyNewChatMessage(receiverId: string, senderName: string, message: string, chatId: string): Promise<void> {
    try {
      await this.createNotification(
        receiverId,
        'Nova Mensagem',
        `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        'chat_message',
        { chatId, senderName, message }
      );
    } catch (error) {
      throw error;
    }
  }

  // Obter estatísticas de notificações
  static async getNotificationStats(userId: string): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    recentNotifications: number;
  }> {
    try {
      const [total, unread, allNotifications] = await Promise.all([
        Notification.countDocuments({ userId }),
        Notification.countDocuments({ userId, isRead: false }),
        Notification.find({ userId })
      ]);

      // Contar por tipo
      const notificationsByType: Record<string, number> = {};
      allNotifications.forEach(notification => {
        notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1;
      });

      // Contar notificações recentes (últimas 24 horas)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentNotifications = allNotifications.filter(n => n.createdAt > oneDayAgo).length;

      return {
        totalNotifications: total,
        unreadNotifications: unread,
        notificationsByType,
        recentNotifications
      };
    } catch (error) {
      throw error;
    }
  }
}
