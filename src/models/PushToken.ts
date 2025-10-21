import mongoose, { Document, Schema } from 'mongoose';
import { IPushToken } from '../types';

export interface IPushTokenModel extends IPushToken {
  // Métodos do modelo
  deactivate(): Promise<IPushTokenModel>;
}

const pushTokenSchema = new Schema<IPushTokenModel>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android', 'web']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceInfo: {
    deviceId: String,
    appVersion: String,
    osVersion: String,
    model: String
  }
}, {
  timestamps: true
});

// Índices compostos para melhor performance
pushTokenSchema.index({ userId: 1, isActive: 1 });
pushTokenSchema.index({ token: 1, isActive: 1 });

// Método para desativar token
pushTokenSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Método estático para buscar tokens ativos de um usuário
pushTokenSchema.statics.findActiveTokensByUserId = function(userId: string) {
  return this.find({ userId, isActive: true });
};

// Método estático para buscar token por valor
pushTokenSchema.statics.findByToken = function(token: string) {
  return this.findOne({ token, isActive: true });
};

export const PushToken = mongoose.model<IPushTokenModel>('PushToken', pushTokenSchema);
