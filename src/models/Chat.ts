import mongoose, { Schema } from 'mongoose';
import { IChat, IChatMessage } from '../types';

const chatMessageSchema = new Schema<IChatMessage>({
  chatId: {
    type: String,
    required: [true, 'ID do chat é obrigatório'],
    ref: 'Chat',
  },
  senderId: {
    type: String,
    required: [true, 'ID do remetente é obrigatório'],
    ref: 'User',
  },
  receiverId: {
    type: String,
    required: [true, 'ID do destinatário é obrigatório'],
    ref: 'User',
  },
  message: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    trim: true,
    maxlength: [1000, 'Mensagem deve ter no máximo 1000 caracteres'],
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  fileUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (this.type === 'text') return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL do arquivo inválida',
    },
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const chatSchema = new Schema<IChat>({
  participants: [{
    type: String,
    required: true,
    ref: 'User',
  }],
  serviceId: {
    type: String,
    required: [true, 'ID do serviço é obrigatório'],
    ref: 'Service',
  },
  lastMessage: {
    type: chatMessageSchema,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
chatMessageSchema.index({ chatId: 1 });
chatMessageSchema.index({ senderId: 1 });
chatMessageSchema.index({ receiverId: 1 });
chatMessageSchema.index({ createdAt: -1 });
chatMessageSchema.index({ isRead: 1 });

chatSchema.index({ participants: 1 });
chatSchema.index({ serviceId: 1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ 'lastMessage.createdAt': -1 });

// Middleware para atualizar última mensagem do chat
chatMessageSchema.post('save', async function() {
  const Chat = mongoose.model('Chat');
  await Chat.findByIdAndUpdate(this.chatId, {
    lastMessage: this,
  });
});

// Virtual para verificar se a mensagem é recente
chatMessageSchema.virtual('isRecent').get(function() {
  const now = new Date();
  const diffTime = now.getTime() - this.createdAt.getTime();
  return diffTime < 5 * 60 * 1000; // 5 minutos
});

// Método para marcar como lida
chatMessageSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Método para verificar se pode ser editada
chatMessageSchema.methods.canBeEdited = function() {
  const now = new Date();
  const diffTime = now.getTime() - this.createdAt.getTime();
  return diffTime < 15 * 60 * 1000; // 15 minutos
};

// Virtual para contar mensagens não lidas
chatSchema.virtual('unreadCount').get(async function() {
  const ChatMessage = mongoose.model('ChatMessage');
  return await ChatMessage.countDocuments({
    chatId: this._id,
    isRead: false,
  });
});

// Método para marcar todas as mensagens como lidas
chatSchema.methods.markAllAsRead = async function(userId: string) {
  const ChatMessage = mongoose.model('ChatMessage');
  await ChatMessage.updateMany(
    { chatId: this._id, receiverId: userId, isRead: false },
    { isRead: true }
  );
};

// Método para obter mensagens não lidas
chatSchema.methods.getUnreadMessages = async function(userId: string) {
  const ChatMessage = mongoose.model('ChatMessage');
  return await ChatMessage.find({
    chatId: this._id,
    receiverId: userId,
    isRead: false,
  }).sort({ createdAt: -1 });
};

// Método para verificar se o usuário pode acessar o chat
chatSchema.methods.canUserAccess = function(userId: string) {
  return this.participants.includes(userId);
};

// Método para obter o outro participante
chatSchema.methods.getOtherParticipant = function(userId: string) {
  return this.participants.find((id: string) => id !== userId);
};

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export const Chat = mongoose.model<IChat>('Chat', chatSchema);
