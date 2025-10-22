import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User } from '../models/User';
import { Chat, ChatMessage } from '../models';
import { PushNotificationService } from './pushNotificationService';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export interface SocketEvents {
  'join:chat': (data: { chatId: string }) => void;
  'leave:chat': (data: { chatId: string }) => void;
  'message:send': (data: { 
    chatId: string; 
    message: string; 
    type?: 'text' | 'image' | 'file';
    fileUrl?: string;
  }) => void;
  'messages:read': (data: { chatId: string }) => void;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, AuthenticatedSocket> = new Map(); // socketId -> socket

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.nodeEnv === 'development' ? "*" : config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      path: '/socket.io/'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Middleware de autenticação
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {

        const token = socket.handshake.auth.token;
        
        if (!token) {
          console.log('❌ Token não fornecido na conexão WebSocket');
          return next(new Error('Token não fornecido'));
        }

        // Verificar token JWT
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        
        // Buscar usuário no banco
        const user = await User.findById(decoded.userId);
        if (!user) {
          return next(new Error('Usuário não encontrado'));
        }

        // Adicionar dados do usuário ao socket
        socket.userId = user._id.toString();
        socket.user = user;
        
        next();
      } catch (error) {
        console.error('❌ Erro na autenticação WebSocket:', error);
        next(new Error('Token inválido'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      
      // Armazenar conexão do usuário
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, socket);
      }

      // Evento: Entrar em uma sala de chat
      socket.on('join:chat', async (data: { chatId: string }) => {
        try {
          const { chatId } = data;
          
          // Verificar se o usuário tem acesso ao chat
          const chat = await Chat.findById(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat não encontrado' });
            return;
          }

          // Verificar se o usuário é participante do chat
          const isParticipant = chat.participants.includes(socket.userId!);
          if (!isParticipant) {
            socket.emit('error', { message: 'Você não tem acesso a este chat' });
            return;
          }

          socket.join(`chat:${chatId}`);
          
          // Marcar mensagens como lidas
          await this.markMessagesAsRead(chatId, socket.userId!);
          
        } catch (error) {
          console.error('❌ Erro ao entrar no chat:', error);
          socket.emit('error', { message: 'Erro ao entrar no chat' });
        }
      });

      // Evento: Sair de uma sala de chat
      socket.on('leave:chat', (data: { chatId: string }) => {
        const { chatId } = data;
        socket.leave(`chat:${chatId}`);
      });

      // Evento: Enviar mensagem
      socket.on('message:send', async (data: { 
        chatId: string; 
        message: string; 
        type?: 'text' | 'image' | 'file';
        fileUrl?: string;
      }) => {
        try {
          const { chatId, message, type = 'text', fileUrl } = data;
          
          // Verificar se o usuário tem acesso ao chat
          const chat = await Chat.findById(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat não encontrado' });
            return;
          }

          // Verificar se o usuário é participante do chat
          const isParticipant = chat.participants.includes(socket.userId!);
          if (!isParticipant) {
            socket.emit('error', { message: 'Você não tem acesso a este chat' });
            return;
          }

          // Encontrar o destinatário (outro participante do chat)
          const messageReceiverId = chat.participants.find(p => p !== socket.userId);
          
          if (!messageReceiverId) {
            socket.emit('error', { message: 'Destinatário não encontrado' });
            return;
          }

          // Criar mensagem
          const newMessage = new ChatMessage({
            chatId,
            senderId: socket.userId,
            receiverId: messageReceiverId,
            message,
            type,
            fileUrl,
            isRead: false
          });

          await newMessage.save();

          // Atualizar última mensagem do chat
          chat.lastMessage = newMessage;
          await chat.save();

          // Emitir mensagem para todos na sala do chat
          this.io.to(`chat:${chatId}`).emit('message:received', {
            _id: newMessage._id,
            chatId: newMessage.chatId,
            senderId: newMessage.senderId,
            receiverId: messageReceiverId,
            message: newMessage.message,
            type: newMessage.type,
            fileUrl: newMessage.fileUrl,
            isRead: newMessage.isRead,
            timestamp: newMessage.createdAt,
            createdAt: newMessage.createdAt
          });

          // Buscar dados populados dos participantes para o evento
          const populatedChat = await Chat.findById(chatId)
            .populate('participants', 'name avatar')
            .populate('serviceId', 'title description status');
          
          // Emitir evento global para atualizar lista de chats
          this.io.to(`chat:${chatId}`).emit('chat:updated', {
            _id: chat._id,
            participants: populatedChat?.participants || chat.participants,
            serviceId: populatedChat?.serviceId || chat.serviceId,
            lastMessage: {
              _id: newMessage._id,
              chatId: newMessage.chatId,
              senderId: newMessage.senderId,
              receiverId: messageReceiverId,
              message: newMessage.message,
              type: newMessage.type,
              fileUrl: newMessage.fileUrl,
              isRead: newMessage.isRead,
              timestamp: newMessage.createdAt,
              createdAt: newMessage.createdAt
            },
            isActive: chat.isActive,
            updatedAt: chat.updatedAt
          });

          // Emitir evento global para atualizar badges (para todos os participantes)
          for (const participantId of chat.participants) {
            const unreadCount = await this.getUnreadCount(participantId, chatId);
            this.emitToUser(participantId, 'chat:badge:update', {
              chatId: chat._id,
              unreadCount
            });
          }

          // Enviar notificação push para o destinatário se estiver offline
          if (messageReceiverId && !this.connectedUsers.has(messageReceiverId)) {
            try {
              await PushNotificationService.sendChatNotification(
                messageReceiverId,
                socket.user?.name || 'Usuário',
                message,
                chatId,
                (chat as any).serviceTitle || 'Serviço'
              );
              console.log(`📤 Notificação push enviada para ${messageReceiverId}`);
            } catch (notificationError) {
              console.error('❌ Erro ao enviar notificação push:', notificationError);
            }
          }

          console.log(`📤 Mensagem enviada por ${socket.user?.name} no chat ${chatId}`);
          
        } catch (error) {
          console.error('❌ Erro ao enviar mensagem:', error);
          socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
      });

      // Evento: Marcar mensagens como lidas
      socket.on('messages:read', async (data: { chatId: string }) => {
        try {
          const { chatId } = data;
          await this.markMessagesAsRead(chatId, socket.userId!);
          
          // Notificar outros participantes que as mensagens foram lidas
          socket.to(`chat:${chatId}`).emit('messages:read', {
            chatId,
            readBy: socket.userId
          });

          // Emitir evento global para atualizar badges
          const chat = await Chat.findById(chatId);
          if (chat) {
            for (const participantId of chat.participants) {
              const unreadCount = await this.getUnreadCount(participantId, chatId);
              this.emitToUser(participantId, 'chat:badge:update', {
                chatId: chat._id,
                unreadCount
              });
            }
          }
          
        } catch (error) {
          console.error('❌ Erro ao marcar mensagens como lidas:', error);
        }
      });

      // Evento: Desconexão
      socket.on('disconnect', (reason) => {
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.userSockets.delete(socket.id);
        }
      });
    });
  }

  private async markMessagesAsRead(chatId: string, userId: string) {
    try {
      await ChatMessage.updateMany(
        { 
          chatId, 
          receiverId: userId, 
          isRead: false 
        },
        { isRead: true }
      );
      
      console.log(`✅ Mensagens marcadas como lidas no chat ${chatId} pelo usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao marcar mensagens como lidas:', error);
    }
  }

  // Métodos públicos para uso em outros serviços
  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  public emitToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Método para obter contagem de mensagens não lidas
  private async getUnreadCount(userId: string, chatId: string): Promise<number> {
    try {
      const count = await ChatMessage.countDocuments({
        chatId,
        receiverId: userId,
        isRead: false
      });
      return count;
    } catch (error) {
      console.error('❌ Erro ao obter contagem de mensagens não lidas:', error);
      return 0;
    }
  }
}

// Instância singleton
let socketService: SocketService | null = null;

export const initializeSocketService = (server: HTTPServer): SocketService => {
  if (!socketService) {
    socketService = new SocketService(server);
  }
  return socketService;
};

export const getSocketService = (): SocketService | null => {
  return socketService;
};
