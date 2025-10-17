import mongoose, { Schema } from 'mongoose';
import { IQuote } from '../types';

const materialSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Nome do material é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome do material deve ter no máximo 100 caracteres'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantidade é obrigatória'],
    min: [0.01, 'Quantidade deve ser maior que zero'],
  },
  unit: {
    type: String,
    required: [true, 'Unidade é obrigatória'],
    enum: ['unidade', 'metro', 'metro_quadrado', 'metro_cubico', 'kg', 'litro', 'caixa', 'pacote'],
  },
  price: {
    type: Number,
    required: [true, 'Preço é obrigatório'],
    min: [0, 'Preço deve ser maior ou igual a zero'],
  },
}, { _id: false });

const laborSchema = new Schema({
  description: {
    type: String,
    required: [true, 'Descrição da mão de obra é obrigatória'],
    trim: true,
    maxlength: [200, 'Descrição deve ter no máximo 200 caracteres'],
  },
  hours: {
    type: Number,
    required: [true, 'Horas são obrigatórias'],
    min: [0.5, 'Horas devem ser pelo menos 0.5'],
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Preço por hora é obrigatório'],
    min: [0, 'Preço por hora deve ser maior ou igual a zero'],
  },
  total: {
    type: Number,
    required: [true, 'Total da mão de obra é obrigatório'],
    min: [0, 'Total deve ser maior ou igual a zero'],
  },
}, { _id: false });

const quoteSchema = new Schema<IQuote>({
  serviceId: {
    type: String,
    required: [true, 'ID do serviço é obrigatório'],
    ref: 'Service',
  },
  professionalId: {
    type: String,
    required: [true, 'ID do profissional é obrigatório'],
    ref: 'User',
  },
  clientId: {
    type: String,
    required: [true, 'ID do cliente é obrigatório'],
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Título do orçamento é obrigatório'],
    trim: true,
    minlength: [5, 'Título deve ter pelo menos 5 caracteres'],
    maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
  },
  description: {
    type: String,
    required: [true, 'Descrição do orçamento é obrigatória'],
    trim: true,
    minlength: [20, 'Descrição deve ter pelo menos 20 caracteres'],
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres'],
  },
  materials: [materialSchema],
  labor: laborSchema,
  totalPrice: {
    type: Number,
    required: [true, 'Preço total é obrigatório'],
    min: [0, 'Preço total deve ser maior ou igual a zero'],
  },
  validUntil: {
    type: Date,
    required: [true, 'Data de validade é obrigatória'],
    validate: {
      validator: function(v: Date) {
        return v > new Date();
      },
      message: 'Data de validade deve ser futura',
    },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  paymentId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
quoteSchema.index({ serviceId: 1 });
quoteSchema.index({ professionalId: 1 });
quoteSchema.index({ clientId: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ paymentStatus: 1 });
quoteSchema.index({ validUntil: 1 });
quoteSchema.index({ createdAt: -1 });

// Middleware para calcular preço total antes de salvar
quoteSchema.pre('save', function(next) {
  if (this.isModified('materials') || this.isModified('labor')) {
    const materialsTotal = this.materials.reduce((sum, material) => {
      return sum + (material.quantity * material.price);
    }, 0);
    
    this.labor.total = this.labor.hours * this.labor.pricePerHour;
    this.totalPrice = materialsTotal + this.labor.total;
  }
  next();
});

// Middleware para verificar se o orçamento expirou
quoteSchema.pre('save', function(next) {
  if (this.validUntil < new Date() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// Virtual para verificar se está expirado
quoteSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

// Virtual para verificar se pode ser aceito
quoteSchema.virtual('canBeAccepted').get(function() {
  return this.status === 'pending' && !this.isExpired;
});

// Virtual para calcular dias até expirar
quoteSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.validUntil.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Método para aceitar orçamento
quoteSchema.methods.accept = function() {
  if (!this.canBeAccepted) {
    throw new Error('Orçamento não pode ser aceito');
  }
  this.status = 'accepted';
  return this.save();
};

// Método para rejeitar orçamento
quoteSchema.methods.reject = function() {
  if (this.status !== 'pending') {
    throw new Error('Apenas orçamentos pendentes podem ser rejeitados');
  }
  this.status = 'rejected';
  return this.save();
};

// Método para marcar como pago
quoteSchema.methods.markAsPaid = function(paymentId: string) {
  if (this.status !== 'accepted') {
    throw new Error('Apenas orçamentos aceitos podem ser marcados como pagos');
  }
  this.paymentStatus = 'paid';
  this.paymentId = paymentId;
  return this.save();
};

// Método para adicionar material
quoteSchema.methods.addMaterial = function(material: any) {
  this.materials.push(material);
  return this.save();
};

// Método para remover material
quoteSchema.methods.removeMaterial = function(materialId: string) {
  this.materials.id(materialId)?.remove();
  return this.save();
};

export const Quote = mongoose.model<IQuote>('Quote', quoteSchema);
