import { Service, User, Quote, Notification } from '../models';
import { IService, IQuote } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';
import { getSocketService } from './socketService';

export class ServiceService {
  // Criar novo serviço
  static async createService(serviceData: Omit<IService, '_id' | 'createdAt' | 'updatedAt'>): Promise<IService> {
    try {
      // Verificar se o cliente existe
      console.log('Dados do serviço:', serviceData);
      const client = await User.findById(serviceData.clientId);
      if (!client || client.role !== 'client') {
        throw badRequest('Cliente não encontrado');
      }

      const service = new Service(serviceData);
      await service.save();

      return service;
    } catch (error) {
      console.log('Erro ao criar serviço', error);
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

  // Iniciar serviço (profissional)
  static async startService(serviceId: string, professionalId: string): Promise<IService> {
    try {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se há um orçamento aceito e pago para este serviço e profissional
      const quote = await Quote.findOne({
        serviceId: serviceId,
        professionalId: professionalId,
        status: 'accepted',
        paymentStatus: 'paid'
      });

      if (!quote) {
        throw badRequest('Não há orçamento aceito e pago para este serviço');
      }

      if (service.status !== 'in_progress') {
        throw badRequest('Serviço não está pronto para ser iniciado');
      }

      // Atualizar status da rota
      service.routeStatus = 'route_started';
      service.routeStartedAt = new Date();
      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitRouteStatusUpdate(service._id.toString(), 'route_started', {
          routeStartedAt: service.routeStartedAt,
        });
      }

      // Criar notificação para o cliente
      await (Notification as any).createNotification(
        service.clientId,
        'Rota Iniciada',
        `O profissional iniciou a rota para o serviço "${service.title}". Você pode acompanhar em tempo real.`,
        'service_started',
        { serviceId: service._id, quoteId: quote._id }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Marcar serviço como concluído (apenas se estiver assinado)
  static async completeService(serviceId: string, professionalId: string): Promise<IService> {
    try {
      const quote = await Quote.findOne({
        serviceId,
        professionalId,
        status: 'accepted'
      });

      if (!quote) {
        throw notFound('Serviço não encontrado ou não autorizado');
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se já está concluído
      if (service.status === 'completed' || service.routeStatus === 'service_completed') {
        throw badRequest('Serviço já foi concluído');
      }

      if (service.status !== 'in_progress') {
        throw badRequest('Apenas serviços em andamento podem ser marcados como concluídos');
      }

      // Verificar se o serviço foi iniciado
      if (service.routeStatus !== 'service_started') {
        throw badRequest('O serviço precisa estar iniciado para ser finalizado');
      }

      // Verificar se foi assinado pelo cliente
      if (!service.clientSignature) {
        throw badRequest('O serviço precisa ser assinado pelo cliente antes de ser finalizado');
      }

      // Finalizar serviço
      service.status = 'completed';
      service.routeStatus = 'service_completed';
      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitRouteStatusUpdate(service._id.toString(), 'service_completed');
      }

      // Criar notificação para o cliente
      await (Notification as any).createNotification(
        service.clientId,
        'Serviço Concluído',
        `O serviço "${service.title}" foi concluído com sucesso.`,
        'service_started',
        { serviceId: service._id, quoteId: quote._id }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar localização do profissional
  static async updateProfessionalLocation(
    serviceId: string,
    professionalId: string,
    location: { lat: number; lng: number }
  ): Promise<IService> {
    try {
      // Verificar se o serviço existe e o profissional está associado
      const quote = await Quote.findOne({
        serviceId,
        professionalId,
        status: 'accepted'
      });

      if (!quote) {
        throw notFound('Serviço não encontrado ou não autorizado');
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Atualizar localização e status
      const timestamp = new Date();
      service.professionalLocation = {
        lat: location.lat,
        lng: location.lng,
        timestamp,
      };

      console.log('📍 [Backend] Saving Service Location:', service.professionalLocation);

      // Se ainda não está em trânsito, atualizar status
      if (service.routeStatus === 'route_started') {
        service.routeStatus = 'in_transit';
      }

      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitLocationUpdate(service._id.toString(), {
          lat: location.lat,
          lng: location.lng,
          timestamp,
        });

        if (service.routeStatus === 'in_transit') {
          socketService.emitRouteStatusUpdate(service._id.toString(), 'in_transit');
        }
      }

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Gerar código de verificação de 5 dígitos
  private static generateVerificationCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  // Marcar que profissional chegou no local e gerar código de verificação
  static async markArrived(serviceId: string, professionalId: string): Promise<IService> {
    try {
      const quote = await Quote.findOne({
        serviceId,
        professionalId,
        status: 'accepted'
      });

      if (!quote) {
        throw notFound('Serviço não encontrado ou não autorizado');
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Gerar código de verificação de 5 dígitos
      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Código expira em 15 minutos

      service.routeStatus = 'arrived';
      service.arrivedAt = new Date();
      service.verificationCode = verificationCode;
      service.verificationCodeExpiresAt = expiresAt;
      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitRouteStatusUpdate(service._id.toString(), 'arrived', {
          arrivedAt: service.arrivedAt,
          verificationCode, // Enviar código para o cliente via WebSocket
        });
      }

      // Criar notificação para o cliente com o código
      await (Notification as any).createNotification(
        service.clientId,
        'Profissional Chegou',
        `O profissional chegou no local. Seu código de verificação é: ${verificationCode}`,
        'service_started',
        { serviceId: service._id, quoteId: quote._id, verificationCode }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Regenerar código de verificação
  static async regenerateVerificationCode(serviceId: string, professionalId: string): Promise<IService> {
    try {
      const quote = await Quote.findOne({
        serviceId,
        professionalId,
        status: 'accepted'
      });

      if (!quote) {
        throw notFound('Serviço não encontrado ou não autorizado');
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se o profissional já chegou
      if (service.routeStatus !== 'arrived') {
        throw badRequest('Você precisa marcar chegada antes de gerar um código de verificação');
      }

      // Gerar novo código de verificação de 5 dígitos
      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Código expira em 15 minutos

      service.verificationCode = verificationCode;
      service.verificationCodeExpiresAt = expiresAt;
      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitRouteStatusUpdate(service._id.toString(), 'arrived', {
          arrivedAt: service.arrivedAt,
          verificationCode, // Enviar novo código para o cliente via WebSocket
        });
      }

      // Criar notificação para o cliente com o novo código
      await (Notification as any).createNotification(
        service.clientId,
        'Novo Código de Verificação',
        `Um novo código de verificação foi gerado. Seu código é: ${verificationCode}`,
        'service_started',
        { serviceId: service._id, quoteId: quote._id, verificationCode }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Verificar código e iniciar serviço
  static async verifyCodeAndStartService(
    serviceId: string,
    professionalId: string,
    code: string
  ): Promise<IService> {
    try {
      const quote = await Quote.findOne({
        serviceId,
        professionalId,
        status: 'accepted'
      });

      if (!quote) {
        throw notFound('Serviço não encontrado ou não autorizado');
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se o código está correto
      if (!service.verificationCode || service.verificationCode !== code) {
        throw badRequest('Código de verificação inválido');
      }

      // Verificar se o código não expirou
      if (service.verificationCodeExpiresAt && service.verificationCodeExpiresAt < new Date()) {
        throw badRequest('Código de verificação expirado');
      }

      // Verificar se o profissional já chegou
      if (service.routeStatus !== 'arrived') {
        throw badRequest('Você precisa marcar chegada antes de iniciar o serviço');
      }

      // Iniciar serviço e limpar código
      service.routeStatus = 'service_started';
      service.serviceStartedAt = new Date();
      service.verificationCode = undefined; // Limpar código após uso
      service.verificationCodeExpiresAt = undefined;
      await service.save();

      // Emitir evento WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitRouteStatusUpdate(service._id.toString(), 'service_started', {
          serviceStartedAt: service.serviceStartedAt,
        });
      }

      // Criar notificação para o cliente
      await (Notification as any).createNotification(
        service.clientId,
        'Serviço Iniciado',
        `O profissional iniciou o serviço "${service.title}" no local.`,
        'service_started',
        { serviceId: service._id, quoteId: quote._id }
      );

      return service;
    } catch (error) {
      throw error;
    }
  }

  // Assinar serviço (cliente assina no celular do profissional)
  static async signService(
    serviceId: string,
    clientId: string | null,
    professionalId: string | null,
    signature: string // Base64 da assinatura
  ): Promise<IService> {
    try {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Se for profissional enviando, verificar se ele está associado ao serviço
      if (professionalId) {
        const quote = await Quote.findOne({
          serviceId,
          professionalId,
          status: 'accepted'
        });

        if (!quote) {
          throw forbidden('Você não tem permissão para coletar assinatura deste serviço');
        }

        // Usar o clientId do serviço
        const actualClientId = service.clientId.toString();

        // Verificar se o serviço foi iniciado
        if (service.routeStatus !== 'service_started') {
          throw badRequest('O serviço precisa estar iniciado para ser assinado');
        }

        // Verificar se já foi assinado (verificar se tem signature, não apenas se o objeto existe)
        if (service.clientSignature && service.clientSignature.signature) {
          throw badRequest('Serviço já foi assinado');
        }

        // Salvar assinatura (coletada pelo profissional, mas assinada pelo cliente)
        service.clientSignature = {
          signature,
          signedAt: new Date(),
          signedBy: actualClientId,
        };
        await service.save();

        // Emitir evento WebSocket
        const socketService = getSocketService();
        if (socketService) {
          socketService.emitRouteStatusUpdate(service._id.toString(), 'service_signed', {
            signedAt: service.clientSignature.signedAt,
          });
        }

        // Criar notificação para o cliente
        await (Notification as any).createNotification(
          actualClientId,
          'Serviço Assinado',
          `A assinatura do serviço "${service.title}" foi coletada pelo profissional.`,
          'service_completed',
          { serviceId: service._id, quoteId: quote._id }
        );

        return service;
      }

      // Se for cliente assinando diretamente
      if (clientId) {
        // Verificar se o cliente é o dono do serviço
        if (service.clientId.toString() !== clientId) {
          throw forbidden('Você não tem permissão para assinar este serviço');
        }

        // Verificar se o serviço foi iniciado
        if (service.routeStatus !== 'service_started') {
          throw badRequest('O serviço precisa estar iniciado para ser assinado');
        }

        // Verificar se já foi assinado (verificar se tem signature, não apenas se o objeto existe)
        if (service.clientSignature && service.clientSignature.signature) {
          throw badRequest('Serviço já foi assinado');
        }

        // Salvar assinatura
        service.clientSignature = {
          signature,
          signedAt: new Date(),
          signedBy: clientId,
        };
        await service.save();

        // Emitir evento WebSocket
        const socketService = getSocketService();
        if (socketService) {
          socketService.emitRouteStatusUpdate(service._id.toString(), 'service_signed', {
            signedAt: service.clientSignature.signedAt,
          });
        }

        return service;
      }

      throw badRequest('Cliente ou profissional deve ser fornecido');
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

  // Buscar todos os serviços (admin)
  static async getAllServices(query: any = {}): Promise<{ services: any[]; total: number; pages: number; page: number; limit: number }> {
    try {
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const filter: any = {};

      if (query.category) {
        filter.category = query.category;
      }

      if (query.status) {
        filter.status = query.status;
      }

      const [services, total] = await Promise.all([
        Service.find(filter)
          .populate('clientId', 'name email phone avatar')
          .populate('professionalId', 'name email phone avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Service.countDocuments(filter)
      ]);

      const pages = Math.ceil(total / limit);

      return {
        services,
        total,
        pages,
        page,
        limit
      };
    } catch (error) {
      throw error;
    }
  }
}
