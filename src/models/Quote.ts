import mongoose, { Schema } from 'mongoose';
import { IQuote } from '../types';

const materialSchema = new Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    maxlength: [100, 'Nome do material deve ter no máximo 100 caracteres'],
  },
  quantity: {
    type: Number,
    required: false,
    min: [0.01, 'Quantidade deve ser maior que zero'],
  },
  unit: {
    type: String,
    required: false,
    enum: ['unidade', 'metro', 'metro_quadrado', 'metro_cubico', 'kg', 'litro', 'caixa', 'pacote'],
  },
  price: {
    type: Number,
    required: false,
    min: [0, 'Preço deve ser maior ou igual a zero'],
  },
}, { _id: false });

const laborSchema = new Schema({
  description: {
    type: String,
    required: [true, 'Descrição da mão de obra é obrigatória'],
    trim: true,
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres'],
  },
  hours: {
    type: Number,
    required: false, // Opcional para orçamento simples
  },
  pricePerHour: {
    type: Number,
    required: false, // Opcional para orçamento simples
  },
  total: {
    type: Number,
    required: [true, 'Valor total da mão de obra é obrigatório'],
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
    required: false,
    trim: true,
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
      validator: function (v: Date) {
        // A validação só se aplica quando o orçamento está sendo criado ou ainda está pendente
        // Se já foi aceito, não precisa validar a data de validade
        if (this.status === 'accepted' || this.status === 'rejected') {
          return true;
        }
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
    default: null, // Mantendo como string simples para compatibilidade
  },
  paymentRef: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
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

// Middleware para calcular preço total antes de salvar (fallback)
quoteSchema.pre('save', function (next) {
  // Só calcular se totalPrice não foi definido
  if (this.totalPrice === undefined || this.totalPrice === null) {
    // Calcular total dos materiais (apenas materiais com nome preenchido)
    const materialsTotal = this.materials.reduce((sum, material) => {
      if (material.name && material.name.trim() !== '') {
        return sum + (material.quantity * material.price);
      }
      return sum;
    }, 0);

    // Calcular total da mão de obra
    if (this.labor) {
      if (this.labor.hours && this.labor.pricePerHour) {
        // Se tem horas e preço, calcular (modo detalhado)
        this.labor.total = this.labor.hours * this.labor.pricePerHour;
      }
      // Se não tem horas/preço, usa o total que já veio no objeto labor (modo simples)

      this.totalPrice = materialsTotal + (this.labor.total || 0);
    } else {
      // Se não tem mão de obra, usar apenas materiais
      this.totalPrice = materialsTotal;
    }
  }

  next();
});

// Middleware para verificar se o orçamento expirou
quoteSchema.pre('save', function (next) {
  if (this.validUntil < new Date() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// Middleware para calcular totais durante atualização
quoteSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;

  if (update && (update.materials || update.labor)) {
    // Calcular total dos materiais
    const materials = update.materials || [];
    const materialsTotal = materials.reduce((sum: number, material: any) => {
      if (material.name && material.name.trim() !== '') {
        return sum + (material.quantity * material.price);
      }
      return sum;
    }, 0);

    // Calcular total da mão de obra
    let laborTotal = 0;
    if (update.labor) {
      if (update.labor.hours && update.labor.pricePerHour) {
        laborTotal = update.labor.hours * update.labor.pricePerHour;
        update.labor.total = laborTotal;
      } else {
        laborTotal = update.labor.total || 0;
      }
    }

    // Calcular preço total
    update.totalPrice = materialsTotal + laborTotal;
  }

  next();
});

// Virtual para verificar se está expirado
quoteSchema.virtual('isExpired').get(function () {
  return this.validUntil < new Date();
});

// Virtual para verificar se pode ser aceito
quoteSchema.virtual('canBeAccepted').get(function () {
  return this.status === 'pending' && !this.isExpired;
});

// Virtual para calcular dias até expirar
quoteSchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date();
  const diffTime = this.validUntil.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Método para aceitar orçamento
quoteSchema.methods.accept = function () {
  if (!this.canBeAccepted) {
    throw new Error('Orçamento não pode ser aceito');
  }
  this.status = 'accepted';
  return this.save();
};

// Método para rejeitar orçamento
quoteSchema.methods.reject = function () {
  if (this.status !== 'pending') {
    throw new Error('Apenas orçamentos pendentes podem ser rejeitados');
  }
  this.status = 'rejected';
  return this.save();
};

// Método para marcar como pago
quoteSchema.methods.markAsPaid = function (paymentId: string) {
  if (this.status !== 'accepted') {
    throw new Error('Apenas orçamentos aceitos podem ser marcados como pagos');
  }
  this.paymentStatus = 'paid';
  this.paymentId = paymentId;
  // Usar validateBeforeSave: false para evitar validação de validUntil que pode ter expirado
  return this.save({ validateBeforeSave: false });
};

// Método para adicionar material
quoteSchema.methods.addMaterial = function (material: any) {
  this.materials.push(material);
  return this.save();
};

// Método para remover material
quoteSchema.methods.removeMaterial = function (materialId: string) {
  this.materials.id(materialId)?.remove();
  return this.save();
};

export const Quote = mongoose.model<IQuote>('Quote', quoteSchema);

