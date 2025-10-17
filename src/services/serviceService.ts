import { Service, User, Quote } from '../models';
import { IService, IQuote } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';

export class ServiceService {
  // Criar novo serviço
  static async createService(serviceData: Omit<IService, '_id' | 'createdAt' | 'updatedAt'>): Promise<IService> {
    try {
      // Verificar se o cliente existe
      const client = await User.findById(serviceData.clientId);
      if (!client || client.role !== 'client') {
        throw badRequest('Cliente não encontrado');
      }

      const service = new Service(serviceData);
      await service.save();

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviço por ID
  static async getServiceById(serviceId: string): Promise<IService> {
    try {
      const service = await Service.findById(serviceId).populate('clientId', 'name email phone');
      if (!service) {
        throw notFound('Serviço não encontrado');
      }
      return service;
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviços do cliente
  static async getClientServices(clientId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  } = {}): Promise<{ services: IService[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status, category } = options;
      const skip = (page - 1) * limit;

      const filter: any = { clientId };
      if (status) filter.status = status;
      if (category) filter.category = category;

      const [services, total] = await Promise.all([
        Service.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'name email phone'),
        Service.countDocuments(filter)
      ]);

      return {
        services,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviços disponíveis para profissionais
  static async getAvailableServices(options: {
    page?: number;
    limit?: number;
    category?: string;
    priority?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  } = {}): Promise<{ services: IService[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, category, priority, lat, lng, radius = 50 } = options;
      const skip = (page - 1) * limit;

      const filter: any = { status: 'pending' };
      if (category) filter.category = category;
      if (priority) filter.priority = priority;

      // Se coordenadas fornecidas, filtrar por proximidade
      if (lat && lng) {
        filter['address.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radius * 1000 // Converter km para metros
          }
        };
      }

      const [services, total] = await Promise.all([
        Service.find(filter)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'name email phone'),
        Service.countDocuments(filter)
      ]);

      return {
        services,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Atualizar serviço
  static async updateService(serviceId: string, clientId: string, updateData: Partial<IService>): Promise<IService> {
    try {
      const service = await Service.findOne({ _id: serviceId, clientId });
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se pode ser atualizado
      if (service.status !== 'pending') {
        throw badRequest('Apenas serviços pendentes podem ser atualizados');
      }

      const updatedService = await Service.findByIdAndUpdate(
        serviceId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedService!;
    } catch (error) {
      throw error;
    }
  }

  // Cancelar serviço
  static async cancelService(serviceId: string, clientId: string, reason?: string): Promise<IService> {
    try {
      const service = await Service.findOne({ _id: serviceId, clientId });
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      if (service.status === 'completed') {
        throw badRequest('Serviços concluídos não podem ser cancelados');
      }

      service.status = 'cancelled';
      await service.save();

      // Cancelar orçamentos pendentes
      await Quote.updateMany(
        { serviceId, status: 'pending' },
        { status: 'expired' }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Marcar serviço como concluído
  static async completeService(serviceId: string, clientId: string): Promise<IService> {
    try {
      const service = await Service.findOne({ _id: serviceId, clientId });
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      if (service.status !== 'in_progress') {
        throw badRequest('Apenas serviços em andamento podem ser marcados como concluídos');
      }

      service.status = 'completed';
      await service.save();

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviços por categoria
  static async getServicesByCategory(category: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ services: IService[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const filter: any = { category };
      if (status) filter.status = status;

      const [services, total] = await Promise.all([
        Service.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'name email phone'),
        Service.countDocuments(filter)
      ]);

      return {
        services,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviços próximos ao profissional
  static async getServicesNearProfessional(professionalId: string, options: {
    page?: number;
    limit?: number;
    category?: string;
    radius?: number;
  } = {}): Promise<{ services: IService[]; total: number; page: number; pages: number }> {
    try {
      // Buscar perfil profissional para obter localização
      const { ProfessionalProfile } = await import('../models');
      const profile = await ProfessionalProfile.findOne({ userId: professionalId });
      
      if (!profile) {
        throw notFound('Perfil profissional não encontrado');
      }

      const { page = 1, limit = 10, category, radius = profile.serviceRadius } = options;
      const skip = (page - 1) * limit;

      const filter: any = { 
        status: 'pending'
      };

      // Se o perfil tem coordenadas, filtrar por proximidade
      if (profile.coordinates?.lat && profile.coordinates?.lng) {
        filter['address.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [profile.coordinates.lng, profile.coordinates.lat]
            },
            $maxDistance: radius * 1000
          }
        };
      }

      if (category) filter.category = category;

      const [services, total] = await Promise.all([
        Service.find(filter)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'name email phone'),
        Service.countDocuments(filter)
      ]);

      return {
        services,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Obter estatísticas do serviço
  static async getServiceStats(serviceId: string): Promise<{
    totalQuotes: number;
    pendingQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
    averagePrice: number;
  }> {
    try {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      const quotes = await Quote.find({ serviceId });
      
      const stats = {
        totalQuotes: quotes.length,
        pendingQuotes: quotes.filter(q => q.status === 'pending').length,
        acceptedQuotes: quotes.filter(q => q.status === 'accepted').length,
        rejectedQuotes: quotes.filter(q => q.status === 'rejected').length,
        averagePrice: quotes.length > 0 
          ? quotes.reduce((sum, q) => sum + q.totalPrice, 0) / quotes.length 
          : 0
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Buscar serviços com filtros avançados
  static async searchServices(searchParams: {
    query?: string;
    category?: string;
    status?: string;
    priority?: string;
    minBudget?: number;
    maxBudget?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ services: IService[]; total: number; page: number; pages: number }> {
    try {
      const { 
        query, 
        category, 
        status, 
        priority, 
        minBudget, 
        maxBudget, 
        lat, 
        lng, 
        radius = 50,
        page = 1, 
        limit = 10 
      } = searchParams;
      
      const skip = (page - 1) * limit;
      const filter: any = {};

      // Filtro de texto
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ];
      }

      // Filtros específicos
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      // Filtro de orçamento
      if (minBudget || maxBudget) {
        filter['budget.min'] = {};
        if (minBudget) filter['budget.min'].$gte = minBudget;
        if (maxBudget) filter['budget.max'] = { $lte: maxBudget };
      }

      // Filtro de localização
      if (lat && lng) {
        filter['address.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radius * 1000
          }
        };
      }

      const [services, total] = await Promise.all([
        Service.find(filter)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'name email phone'),
        Service.countDocuments(filter)
      ]);

      return {
        services,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }
}
