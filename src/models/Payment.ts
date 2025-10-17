import mongoose, { Schema } from 'mongoose';
import { IPayment } from '../types';

const paymentSchema = new Schema<IPayment>({
  quoteId: {
    type: String,
    required: [true, 'ID do orçamento é obrigatório'],
    ref: 'Quote',
  },
  clientId: {
    type: String,
    required: [true, 'ID do cliente é obrigatório'],
    ref: 'User',
  },
  professionalId: {
    type: String,
    required: [true, 'ID do profissional é obrigatório'],
    ref: 'User',
  },
  amount: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero'],
  },
  currency: {
    type: String,
    default: 'BRL',
    enum: ['BRL', 'USD', 'EUR'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    required: [true, 'Método de pagamento é obrigatório'],
    enum: ['credit_card', 'pix', 'bank_transfer'],
  },
  stripePaymentIntentId: {
    type: String,
    default: null,
  },
  transactionId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ quoteId: 1 });
paymentSchema.index({ clientId: 1 });
paymentSchema.index({ professionalId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual para verificar se pode ser reembolsado
paymentSchema.virtual('canBeRefunded').get(function() {
  return this.status === 'completed';
});

// Virtual para verificar se está processando
paymentSchema.virtual('isProcessing').get(function() {
  return this.status === 'pending';
});

// Virtual para verificar se foi bem-sucedido
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed';
});

// Virtual para verificar se falhou
paymentSchema.virtual('hasFailed').get(function() {
  return this.status === 'failed';
});

// Método para marcar como concluído
paymentSchema.methods.markAsCompleted = function(transactionId?: string) {
  if (this.status !== 'pending') {
    throw new Error('Apenas pagamentos pendentes podem ser marcados como concluídos');
  }
  this.status = 'completed';
  if (transactionId) {
    this.transactionId = transactionId;
  }
  return this.save();
};

// Método para marcar como falhado
paymentSchema.methods.markAsFailed = function() {
  if (this.status !== 'pending') {
    throw new Error('Apenas pagamentos pendentes podem ser marcados como falhados');
  }
  this.status = 'failed';
  return this.save();
};

// Método para processar reembolso
paymentSchema.methods.processRefund = function() {
  if (!this.canBeRefunded) {
    throw new Error('Apenas pagamentos concluídos podem ser reembolsados');
  }
  this.status = 'refunded';
  return this.save();
};

// Método para obter status em português
paymentSchema.methods.getStatusInPortuguese = function() {
  const statusMap = {
    pending: 'Pendente',
    completed: 'Concluído',
    failed: 'Falhou',
    refunded: 'Reembolsado',
  };
  return statusMap[this.status as keyof typeof statusMap];
};

// Método para obter método de pagamento em português
paymentSchema.methods.getPaymentMethodInPortuguese = function() {
  const methodMap = {
    credit_card: 'Cartão de Crédito',
    pix: 'PIX',
    bank_transfer: 'Transferência Bancária',
  };
  return methodMap[this.paymentMethod as keyof typeof methodMap];
};

// Método para formatar valor
paymentSchema.methods.formatAmount = function() {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
};

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
