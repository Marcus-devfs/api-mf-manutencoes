import { Chat, ChatMessage, User, Service } from '../models';
import { IChat, IChatMessage } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';
import { PushNotificationService } from './pushNotificationService';
import { getSocketService } from './socketService';

export class ChatService {
  // Criar ou buscar chat existente
  static async getOrCreateChat(serviceId: string, userId1: string, userId2: string): Promise<IChat> {
    try {
      // Verificar se o serviço existe
      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se os usuários têm permissão para acessar este serviço
      if (service.clientId !== userId1 && service.clientId !== userId2) {
        throw forbidden('Você não tem permissão para acessar este chat');
      }

      // Buscar chat existente
      let chat = await Chat.findOne({
        serviceId,
        participants: { $all: [userId1, userId2] }
      });

      if (!chat) {
        // Criar novo chat
        chat = new Chat({
          participants: [userId1, userId2],
          serviceId,
          isActive: true
        });
        await chat.save();
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Enviar mensagem
  static async sendMessage(messageData: {
    chatId: string;
    senderId: string;
    receiverId: string;
    message: string;
    type?: 'text' | 'image' | 'file';
    fileUrl?: string;
  }): Promise<IChatMessage> {
    try {
      const { chatId, senderId, receiverId, message, type = 'text', fileUrl } = messageData;

      // Verificar se o chat existe e o usuário tem acesso
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(senderId)) {
        throw forbidden('Você não tem permissão para enviar mensagens neste chat');
      }

      // Criar mensagem
      const chatMessage = new ChatMessage({
        chatId,
        senderId,
        receiverId,
        message,
        type,
        fileUrl,
        isRead: false
      });

      await chatMessage.save();

      // Atualizar última mensagem do chat
      chat.lastMessage = chatMessage;
      await chat.save();

      // Enviar notificação push para o destinatário
      try {
        const sender = await User.findById(senderId);
        const service = await Service.findById(chat.serviceId);
        
        if (sender) {
          await PushNotificationService.sendChatNotification(
            receiverId,
            sender.name,
            message,
            chatId,
            service?.title
          );
          console.log(`📤 Notificação de chat enviada para ${receiverId}`);
        }
      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificação push:', notificationError);
        // Não falhar a operação se a notificação falhar
      }

      // Notificar via WebSocket se disponível
      try {
        const socketService = getSocketService();
        if (socketService) {
          socketService.emitToChat(chatId, 'message:received', {
            _id: chatMessage._id,
            chatId: chatMessage.chatId,
            senderId: chatMessage.senderId,
            receiverId: chatMessage.receiverId,
            message: chatMessage.message,
            type: chatMessage.type,
            fileUrl: chatMessage.fileUrl,
            isRead: chatMessage.isRead,
            timestamp: chatMessage.createdAt,
            createdAt: chatMessage.createdAt
          });
          console.log(`🔌 Mensagem enviada via WebSocket para chat ${chatId}`);
        }
      } catch (wsError) {
        console.error('❌ Erro ao enviar via WebSocket:', wsError);
        // Não falhar a operação se o WebSocket falhar
      }

      return chatMessage;
    } catch (error) {
      throw error;
    }
  }

  // Buscar mensagens do chat
  static async getChatMessages(chatId: string, userId: string, options: {
    page?: number;
    limit?: number;
    before?: Date;
  } = {}): Promise<{ messages: IChatMessage[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 50, before } = options;
      const skip = (page - 1) * limit;

      // Verificar se o usuário tem acesso ao chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(userId)) {
        throw forbidden('Você não tem permissão para acessar este chat');
      }

      const filter: any = { chatId };
      if (before) {
        filter.createdAt = { $lt: before };
      }

      const [messages, total] = await Promise.all([
        ChatMessage.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'name avatar')
          .populate('receiverId', 'name avatar'),
        ChatMessage.countDocuments(filter)
      ]);

      return {
        messages: messages.reverse(), // Ordenar cronologicamente
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Marcar mensagens como lidas
  static async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // Verificar se o usuário tem acesso ao chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(userId)) {
        throw forbidden('Você não tem permissão para acessar este chat');
      }

      // Marcar mensagens não lidas como lidas
      await ChatMessage.updateMany(
        { chatId, receiverId: userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      throw error;
    }
  }

  // Buscar chats do usuário
  static async getUserChats(userId: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ chats: IChat[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const [chats, total] = await Promise.all([
        Chat.find({ 
          participants: userId, 
          isActive: true 
        })
          .sort({ 'lastMessage.createdAt': -1 })
          .skip(skip)
          .limit(limit)
          .populate('participants', 'name avatar')
          .populate('serviceId', 'title description status'),
        Chat.countDocuments({ 
          participants: userId, 
          isActive: true 
        })
      ]);

      return {
        chats,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar chat específico
  static async getChatById(chatId: string, userId: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId)
        .populate('participants', 'name avatar email phone')
        .populate('serviceId', 'title description status category');

      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.some((participant: any) => participant._id.toString() === userId)) {
        throw forbidden('Você não tem permissão para acessar este chat');
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Obter contagem de mensagens não lidas
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await ChatMessage.countDocuments({
        receiverId: userId,
        isRead: false
      });

      return count;
    } catch (error) {
      throw error;
    }
  }

  // Obter contagem de mensagens não lidas por chat
  static async getUnreadCountByChat(chatId: string, userId: string): Promise<number> {
    try {
      const count = await ChatMessage.countDocuments({
        chatId,
        receiverId: userId,
        isRead: false
      });

      return count;
    } catch (error) {
      throw error;
    }
  }

  // Editar mensagem
  static async editMessage(messageId: string, userId: string, newMessage: string): Promise<IChatMessage> {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw notFound('Mensagem não encontrada');
      }

      if (message.senderId !== userId) {
        throw forbidden('Você só pode editar suas próprias mensagens');
      }

      if (!message.canBeEdited()) {
        throw badRequest('Mensagem não pode mais ser editada (tempo limite excedido)');
      }

      message.message = newMessage;
      await message.save();

      return message;
    } catch (error) {
      throw error;
    }
  }

  // Deletar mensagem
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw notFound('Mensagem não encontrada');
      }

      if (message.senderId !== userId) {
        throw forbidden('Você só pode deletar suas próprias mensagens');
      }

      await ChatMessage.findByIdAndDelete(messageId);
    } catch (error) {
      throw error;
    }
  }

  // Arquivar chat
  static async archiveChat(chatId: string, userId: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(userId)) {
        throw forbidden('Você não tem permissão para arquivar este chat');
      }

      chat.isActive = false;
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Reativar chat
  static async unarchiveChat(chatId: string, userId: string): Promise<IChat> {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(userId)) {
        throw forbidden('Você não tem permissão para reativar este chat');
      }

      chat.isActive = true;
      await chat.save();

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Buscar mensagens com filtros
  static async searchMessages(chatId: string, userId: string, query: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ messages: IChatMessage[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // Verificar se o usuário tem acesso ao chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw notFound('Chat não encontrado');
      }

      if (!chat.participants.includes(userId)) {
        throw forbidden('Você não tem permissão para acessar este chat');
      }

      const filter = {
        chatId,
        message: { $regex: query, $options: 'i' }
      };

      const [messages, total] = await Promise.all([
        ChatMessage.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'name avatar'),
        ChatMessage.countDocuments(filter)
      ]);

      return {
        messages,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Obter estatísticas do chat
  static async getChatStats(userId: string): Promise<{
    totalChats: number;
    activeChats: number;
    totalMessages: number;
    unreadMessages: number;
  }> {
    try {
      const [totalChats, activeChats, totalMessages, unreadMessages] = await Promise.all([
        Chat.countDocuments({ participants: userId }),
        Chat.countDocuments({ participants: userId, isActive: true }),
        ChatMessage.countDocuments({ senderId: userId }),
        ChatMessage.countDocuments({ receiverId: userId, isRead: false })
      ]);

      return {
        totalChats,
        activeChats,
        totalMessages,
        unreadMessages
      };
    } catch (error) {
      throw error;
    }
  }
}

