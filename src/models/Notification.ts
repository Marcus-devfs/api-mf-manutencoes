import mongoose, { Schema } from 'mongoose';
import { INotification } from '../types';

const notificationSchema = new Schema<INotification>({
  userId: {
    type: String,
    required: [true, 'ID do usuário é obrigatório'],
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Título da notificação é obrigatório'],
    trim: true,
    maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
  },
  message: {
    type: String,
    required: [true, 'Mensagem da notificação é obrigatória'],
    trim: true,
    maxlength: [500, 'Mensagem deve ter no máximo 500 caracteres'],
  },
  type: {
    type: String,
    required: [true, 'Tipo da notificação é obrigatório'],
    enum: ['quote_received', 'quote_accepted', 'quote_rejected', 'payment_received', 'service_completed', 'chat_message'],
  },
  data: {
    type: Schema.Types.Mixed,
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// Virtual para verificar se é recente
notificationSchema.virtual('isRecent').get(function() {
  const now = new Date();
  const diffTime = now.getTime() - this.createdAt.getTime();
  return diffTime < 24 * 60 * 60 * 1000; // 24 horas
});

// Virtual para obter tipo em português
notificationSchema.virtual('typeInPortuguese').get(function() {
  const typeMap = {
    quote_received: 'Novo Orçamento',
    quote_accepted: 'Orçamento Aceito',
    quote_rejected: 'Orçamento Rejeitado',
    payment_received: 'Pagamento Recebido',
    service_completed: 'Serviço Concluído',
    chat_message: 'Nova Mensagem',
  };
  return typeMap[this.type as keyof typeof typeMap];
});

// Método para marcar como lida
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Método para marcar como não lida
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  return this.save();
};

// Método estático para criar notificação
notificationSchema.statics.createNotification = function(
  userId: string,
  title: string,
  message: string,
  type: string,
  data?: any
) {
  return this.create({
    userId,
    title,
    message,
    type,
    data,
  });
};

// Método estático para marcar todas como lidas
notificationSchema.statics.markAllAsRead = function(userId: string) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

// Método estático para obter notificações não lidas
notificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ userId, isRead: false });
};

// Método estático para obter notificações recentes
notificationSchema.statics.getRecent = function(userId: string, limit: number = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
