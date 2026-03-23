import mongoose, { Schema } from 'mongoose';
import { ISupport, ISupportMessage } from '../types';

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    senderId: {
      type: String,
      required: true,
      ref: 'User',
    },
    senderRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Mensagem é obrigatória'],
      trim: true,
      maxlength: [2000, 'Mensagem deve ter no máximo 2000 caracteres'],
    },
  },
  { timestamps: true }
);

const supportSchema = new Schema<ISupport>(
  {
    userId: {
      type: String,
      required: [true, 'ID do usuário é obrigatório'],
      ref: 'User',
    },
    subject: {
      type: String,
      required: [true, 'Assunto é obrigatório'],
      trim: true,
      maxlength: [200, 'Assunto deve ter no máximo 200 caracteres'],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed'],
      default: 'open',
    },
    messages: [supportMessageSchema],
  },
  { timestamps: true }
);

supportSchema.index({ userId: 1 });
supportSchema.index({ status: 1 });
supportSchema.index({ createdAt: -1 });

export const Support = mongoose.model<ISupport>('Support', supportSchema);
