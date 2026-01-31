import mongoose, { Schema } from 'mongoose';
import { IService, SERVICE_CATEGORIES } from '../types';

const serviceSchema = new Schema<IService>({
  clientId: {
    type: String,
    required: [true, 'ID do cliente é obrigatório'],
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Título do serviço é obrigatório'],
    trim: true,
    minlength: [5, 'Título deve ter pelo menos 5 caracteres'],
    maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
  },
  description: {
    type: String,
    required: [true, 'Descrição do serviço é obrigatória'],
    trim: true,
    minlength: [20, 'Descrição deve ter pelo menos 20 caracteres'],
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres'],
  },
  category: {
    type: String,
    required: [true, 'Categoria é obrigatória'],
    enum: SERVICE_CATEGORIES,
  },
  images: [{
    type: String,
    validate: {
      validator: function (v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: 'URL da imagem inválida',
    },
  }],
  address: {
    title: {
      type: String,
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    number: {
      type: String,
      trim: true,
    },
    complement: {
      type: String,
      trim: true,
    },
    neighborhood: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
  },
  budget: {
    min: {
      type: Number,
      min: [0, 'Orçamento mínimo deve ser maior que zero'],
    },
    max: {
      type: Number,
      min: [0, 'Orçamento máximo deve ser maior que zero'],
      validate: {
        validator: function (this: IService, v: number) {
          return !this.budget?.min || v >= this.budget.min;
        },
        message: 'Orçamento máximo deve ser maior ou igual ao mínimo',
      },
    },
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  deadline: {
    type: Date,
    validate: {
      validator: function (v: Date) {
        return !v || v > new Date();
      },
      message: 'Prazo deve ser uma data futura',
    },
  },
  // Route tracking fields
  routeStatus: {
    type: String,
    enum: ['not_started', 'route_started', 'in_transit', 'arrived', 'service_started', 'service_completed'],
    default: 'not_started',
  },
  professionalLocation: {
    lat: {
      type: Number,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  routeStartedAt: {
    type: Date,
  },
  arrivedAt: {
    type: Date,
  },
  serviceStartedAt: {
    type: Date,
  },
  // Verification and signature fields
  verificationCode: {
    type: String,
    length: 5,
  },
  verificationCodeExpiresAt: {
    type: Date,
  },
  clientSignature: {
    signature: {
      type: String, // Base64 da assinatura
    },
    signedAt: {
      type: Date,
    },
    signedBy: {
      type: String, // clientId
      ref: 'User',
    },
  },
}, {
  timestamps: true,
});

// Indexes
serviceSchema.index({ clientId: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ priority: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ 'address.coordinates': '2dsphere' });

// Virtual para calcular dias até o prazo
serviceSchema.virtual('daysUntilDeadline').get(function () {
  if (!this.deadline) return null;
  const now = new Date();
  const diffTime = this.deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar se está próximo do prazo
serviceSchema.virtual('isNearDeadline').get(function () {
  const days = this.daysUntilDeadline;
  return days !== null && days <= 3 && days >= 0;
});

// Virtual para verificar se está atrasado
serviceSchema.virtual('isOverdue').get(function () {
  const days = this.daysUntilDeadline;
  return days !== null && days < 0;
});

// Método para atualizar status
serviceSchema.methods.updateStatus = function (newStatus: string) {
  this.status = newStatus;
  return this.save();
};

// Método para adicionar imagem
serviceSchema.methods.addImage = function (imageUrl: string) {
  if (this.images.length < 10) { // Limite de 10 imagens
    this.images.push(imageUrl);
    return this.save();
  }
  throw new Error('Limite máximo de imagens atingido');
};

// Método para remover imagem
serviceSchema.methods.removeImage = function (imageUrl: string) {
  this.images = this.images.filter((img: string) => img !== imageUrl);
  return this.save();
};

export const Service = mongoose.model<IService>('Service', serviceSchema);

