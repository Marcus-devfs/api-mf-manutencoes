import { Request } from 'express';
import { Document } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'client' | 'professional' | 'admin';
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  cpfCnpj?: string;
  birthDate?: Date;
  // Asaas fields
  asaasCustomerId?: string;
  asaasAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Address Types
export interface IAddress extends Document {
  _id: string;
  userId: string;
  title: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Service Types
export type RouteStatus = 'not_started' | 'route_started' | 'in_transit' | 'arrived' | 'service_started' | 'service_completed';

export interface IService extends Document {
  _id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  address: IAddress;
  budget?: {
    min: number;
    max: number;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  // Route tracking fields
  routeStatus?: RouteStatus;
  professionalLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  routeStartedAt?: Date;
  arrivedAt?: Date;
  serviceStartedAt?: Date;
  // Verification and signature fields
  verificationCode?: string;
  verificationCodeExpiresAt?: Date;
  clientSignature?: {
    signature: string; // Base64 da assinatura
    signedAt: Date;
    signedBy: string; // clientId
  };
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  daysUntilDeadline: number | null;
  isNearDeadline: boolean;
  isOverdue: boolean;
  // Methods
  updateStatus(newStatus: string): Promise<IService>;
  addImage(imageUrl: string): Promise<IService>;
  removeImage(imageUrl: string): Promise<IService>;
}

// Quote Types
export interface IQuote extends Document {
  _id: string;
  serviceId: string;
  professionalId: string;
  clientId: string;
  title: string;
  description: string;
  materials: {
    name: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  labor: {
    description: string;
    hours: number;
    pricePerHour: number;
    total: number;
  };
  totalPrice: number;
  validUntil: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  isExpired: boolean;
  canBeAccepted: boolean;
  daysUntilExpiry: number;
  // Methods
  accept(): Promise<IQuote>;
  reject(): Promise<IQuote>;
  markAsPaid(paymentId: string): Promise<IQuote>;
  addMaterial(material: any): Promise<IQuote>;
  removeMaterial(materialId: string): Promise<IQuote>;
}

// Chat Types
export interface IChatMessage extends Document {
  _id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  message: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  isRead: boolean;
  createdAt: Date;
  // Virtual properties
  isRecent: boolean;
  // Methods
  markAsRead(): Promise<IChatMessage>;
  canBeEdited(): boolean;
}

export interface IChat extends Document {
  _id: string;
  participants: string[];
  serviceId: string;
  lastMessage?: IChatMessage;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Types
export interface IPayment extends Document {
  _id: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'credit_card' | 'pix' | 'bank_transfer';
  stripePaymentIntentId?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  canBeRefunded: boolean;
  isProcessing: boolean;
  isSuccessful: boolean;
  hasFailed: boolean;
  // Split Analysis
  appFee: number;
  netAmount: number;
  gatewayFee: number;
  availableAt: Date;
  // Methods
  markAsCompleted(transactionId?: string): Promise<IPayment>;
  markAsFailed(): Promise<IPayment>;
  processRefund(): Promise<IPayment>;
  getStatusInPortuguese(): string;
  getPaymentMethodInPortuguese(): string;
  formatAmount(): string;
}

// Professional Profile Types
export interface IProfessionalProfile extends Document {
  _id: string;
  userId: string;
  bio: string;
  specialties: string[];
  experience: number;
  rating: number;
  totalJobs: number;
  portfolio: {
    title: string;
    description: string;
    images: string[];
    category: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    date: Date;
    image?: string;
  }[];
  availability: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  serviceRadius: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  averageRating: number;
  isAvailableToday: boolean;
  todaySchedule: any;
  // Methods
  addSpecialty(specialty: string): Promise<IProfessionalProfile>;
  removeSpecialty(specialty: string): Promise<IProfessionalProfile>;
  addPortfolioItem(item: any): Promise<IProfessionalProfile>;
  removePortfolioItem(itemId: string): Promise<IProfessionalProfile>;
  addCertification(certification: any): Promise<IProfessionalProfile>;
  removeCertification(certificationId: string): Promise<IProfessionalProfile>;
  updateAvailability(day: string, availability: any): Promise<IProfessionalProfile>;
  calculateDistance(lat: number, lng: number): number;
  isWithinRadius(lat: number, lng: number): boolean;
}

// Request Types
export interface AuthRequest extends Request {
  user?: IUser;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination Types
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Service Categories
export const SERVICE_CATEGORIES = [
  'portas',
  'janelas',
  'moveis',
  'reparos',
  'instalacao',
  'manutencao',
  'restauracao',
  'customizacao',
  'outros'
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

// Notification Types
export interface INotification extends Document {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'quote_received' | 'quote_accepted' | 'quote_rejected' | 'payment_received' | 'payment_confirmed' | 'service_started' | 'service_completed' | 'chat_message';
  data?: any;
  isRead: boolean;
  createdAt: Date;
  // Virtual properties
  isRecent: boolean;
  typeInPortuguese: string;
  // Methods
  markAsRead(): Promise<INotification>;
  markAsUnread(): Promise<INotification>;
  // Static methods
  createNotification(userId: string, title: string, message: string, type: string, data?: any): Promise<INotification>;
  markAllAsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  getRecent(userId: string, limit?: number): Promise<INotification[]>;
}

// Push Token Interface
export interface IPushToken extends Document {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  deviceInfo?: {
    deviceId?: string;
    appVersion?: string;
    osVersion?: string;
    model?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
