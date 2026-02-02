import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [50, 'Nome deve ter no máximo 50 caracteres'],
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'],
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false, // Não incluir senha por padrão nas consultas
  },
  phone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true,
    match: [/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX'],
  },
  role: {
    type: String,
    enum: ['client', 'professional', 'admin'],
    default: 'client',
    required: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  asaasCustomerId: {
    type: String,
    default: null,
  },
  asaasAccountId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    },
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Middleware para hash da senha antes de atualizar
userSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as any;

  if (update && update.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      update.password = await bcrypt.hash(update.password, salt);
    } catch (error) {
      next(error as Error);
    }
  }

  next();
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para gerar token de verificação
userSchema.methods.generateVerificationToken = function (): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Método para gerar token de reset de senha
userSchema.methods.generateResetToken = function (): string {
  const crypto = require('crypto');
  this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
  return this.resetPasswordToken;
};

// Virtual para nome completo
userSchema.virtual('fullName').get(function () {
  return this.name;
});

// Virtual para URL do avatar
userSchema.virtual('avatarUrl').get(function () {
  if (this.avatar) {
    return this.avatar.startsWith('http') ? this.avatar : `${process.env.CLOUDINARY_BASE_URL}/${this.avatar}`;
  }
  return null;
});

export const User = mongoose.model<IUser>('User', userSchema);
