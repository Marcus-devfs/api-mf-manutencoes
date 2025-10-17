import mongoose, { Schema } from 'mongoose';
import { IAddress } from '../types';

const addressSchema = new Schema<IAddress>({
  userId: {
    type: String,
    required: [true, 'ID do usuário é obrigatório'],
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Título do endereço é obrigatório'],
    trim: true,
    maxlength: [50, 'Título deve ter no máximo 50 caracteres'],
  },
  street: {
    type: String,
    required: [true, 'Rua é obrigatória'],
    trim: true,
    maxlength: [100, 'Rua deve ter no máximo 100 caracteres'],
  },
  number: {
    type: String,
    required: [true, 'Número é obrigatório'],
    trim: true,
    maxlength: [10, 'Número deve ter no máximo 10 caracteres'],
  },
  complement: {
    type: String,
    trim: true,
    maxlength: [50, 'Complemento deve ter no máximo 50 caracteres'],
  },
  neighborhood: {
    type: String,
    required: [true, 'Bairro é obrigatório'],
    trim: true,
    maxlength: [50, 'Bairro deve ter no máximo 50 caracteres'],
  },
  city: {
    type: String,
    required: [true, 'Cidade é obrigatória'],
    trim: true,
    maxlength: [50, 'Cidade deve ter no máximo 50 caracteres'],
  },
  state: {
    type: String,
    required: [true, 'Estado é obrigatório'],
    trim: true,
    maxlength: [2, 'Estado deve ter 2 caracteres'],
    uppercase: true,
  },
  zipCode: {
    type: String,
    required: [true, 'CEP é obrigatório'],
    trim: true,
    match: [/^\d{5}-?\d{3}$/, 'CEP deve estar no formato XXXXX-XXX'],
  },
  isDefault: {
    type: Boolean,
    default: false,
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
}, {
  timestamps: true,
});

// Indexes
addressSchema.index({ userId: 1 });
addressSchema.index({ isDefault: 1 });
addressSchema.index({ coordinates: '2dsphere' });

// Middleware para garantir apenas um endereço padrão por usuário
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await Address.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual para endereço completo
addressSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.street,
    this.number,
    this.complement,
    this.neighborhood,
    this.city,
    this.state,
    this.zipCode
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Método para formatar CEP
addressSchema.methods.formatZipCode = function(): string {
  return this.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const Address = mongoose.model<IAddress>('Address', addressSchema);
