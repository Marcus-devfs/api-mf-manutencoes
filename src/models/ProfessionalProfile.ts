import mongoose, { Schema } from 'mongoose';
import { IProfessionalProfile } from '../types';

const portfolioItemSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Título do portfólio é obrigatório'],
    trim: true,
    maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
  },
  description: {
    type: String,
    required: [true, 'Descrição do portfólio é obrigatória'],
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres'],
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
  category: {
    type: String,
    required: [true, 'Categoria do portfólio é obrigatória'],
    trim: true,
  },
}, { _id: false });

const certificationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Nome da certificação é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
  },
  issuer: {
    type: String,
    required: [true, 'Emissor da certificação é obrigatório'],
    trim: true,
    maxlength: [100, 'Emissor deve ter no máximo 100 caracteres'],
  },
  date: {
    type: Date,
    required: [true, 'Data da certificação é obrigatória'],
  },
  image: {
    type: String,
    validate: {
      validator: function (v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: 'URL da imagem inválida',
    },
  },
}, { _id: false });

const availabilitySchema = new Schema({
  start: {
    type: String,
    required: [true, 'Horário de início é obrigatório'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de horário inválido (HH:MM)'],
  },
  end: {
    type: String,
    required: [true, 'Horário de fim é obrigatório'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de horário inválido (HH:MM)'],
  },
  available: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const professionalProfileSchema = new Schema<IProfessionalProfile>({
  userId: {
    type: String,
    required: [true, 'ID do usuário é obrigatório'],
    ref: 'User',
    unique: true,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Biografia deve ter no máximo 500 caracteres'],
  },
  specialties: [{
    type: String,
    required: [true, 'Especialidade é obrigatória'],
    trim: true,
    maxlength: [50, 'Especialidade deve ter no máximo 50 caracteres'],
  }],
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experiência deve ser maior ou igual a zero'],
    max: [50, 'Experiência deve ser menor ou igual a 50 anos'],
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Avaliação deve ser maior ou igual a zero'],
    max: [5, 'Avaliação deve ser menor ou igual a 5'],
  },
  totalJobs: {
    type: Number,
    default: 0,
    min: [0, 'Total de trabalhos deve ser maior ou igual a zero'],
  },
  portfolio: [portfolioItemSchema],
  certifications: [certificationSchema],
  availability: {
    monday: availabilitySchema,
    tuesday: availabilitySchema,
    wednesday: availabilitySchema,
    thursday: availabilitySchema,
    friday: availabilitySchema,
    saturday: availabilitySchema,
    sunday: availabilitySchema,
  },
  serviceRadius: {
    type: Number,
    required: [true, 'Raio de atendimento é obrigatório'],
    min: [1, 'Raio deve ser pelo menos 1 km'],
    max: [100, 'Raio deve ser no máximo 100 km'],
    default: 10,
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
professionalProfileSchema.index({ userId: 1 });
professionalProfileSchema.index({ specialties: 1 });
professionalProfileSchema.index({ rating: -1 });
professionalProfileSchema.index({ experience: -1 });
professionalProfileSchema.index({ totalJobs: -1 });

// Virtual para calcular média de avaliações
professionalProfileSchema.virtual('averageRating').get(function () {
  return this.rating;
});

// Virtual para verificar se está disponível hoje
professionalProfileSchema.virtual('isAvailableToday').get(function () {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const dayAvailability = this.availability[today as keyof typeof this.availability];
  return dayAvailability?.available || false;
});

// Virtual para obter horários de hoje
professionalProfileSchema.virtual('todaySchedule').get(function () {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  return this.availability[today as keyof typeof this.availability];
});

// Método para adicionar especialidade
professionalProfileSchema.methods.addSpecialty = function (specialty: string) {
  if (!this.specialties.includes(specialty)) {
    this.specialties.push(specialty);
    return this.save();
  }
  return Promise.resolve(this);
};

// Método para remover especialidade
professionalProfileSchema.methods.removeSpecialty = function (specialty: string) {
  this.specialties = this.specialties.filter((s: string) => s !== specialty);
  return this.save();
};

// Método para adicionar item ao portfólio
professionalProfileSchema.methods.addPortfolioItem = function (item: any) {
  this.portfolio.push(item);
  return this.save();
};

// Método para remover item do portfólio
professionalProfileSchema.methods.removePortfolioItem = function (itemId: string) {
  this.portfolio.id(itemId)?.remove();
  return this.save();
};

// Método para adicionar certificação
professionalProfileSchema.methods.addCertification = function (certification: any) {
  this.certifications.push(certification);
  return this.save();
};

// Método para remover certificação
professionalProfileSchema.methods.removeCertification = function (certificationId: string) {
  this.certifications.id(certificationId)?.remove();
  return this.save();
};

// Método para atualizar disponibilidade
professionalProfileSchema.methods.updateAvailability = function (day: string, availability: any) {
  if (this.availability[day as keyof typeof this.availability]) {
    this.availability[day as keyof typeof this.availability] = availability;
    return this.save();
  }
  throw new Error('Dia inválido');
};

// Método para calcular distância
professionalProfileSchema.methods.calculateDistance = function (lat: number, lng: number) {
  // Implementar cálculo de distância usando fórmula de Haversine
  // Por enquanto, retornar 0
  return 0;
};

// Método para verificar se está dentro do raio
professionalProfileSchema.methods.isWithinRadius = function (lat: number, lng: number) {
  const distance = this.calculateDistance(lat, lng);
  return distance <= this.serviceRadius;
};

export const ProfessionalProfile = mongoose.model<IProfessionalProfile>('ProfessionalProfile', professionalProfileSchema);
