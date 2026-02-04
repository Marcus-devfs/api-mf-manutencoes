import { Quote, Service, User, Payment, Notification } from '../models';
import { IQuote, IService } from '../types';
import { createError, notFound, badRequest, forbidden } from '../middlewares/errorHandler';

export class QuoteService {
  // Criar novo orçamento
  static async createQuote(quoteData: Omit<IQuote, '_id' | 'createdAt' | 'updatedAt'>): Promise<IQuote> {
    try {
      // Verificar se o serviço existe e está pendente
      const service = await Service.findById(quoteData.serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      if (service.status !== 'pending') {
        throw badRequest('Apenas serviços pendentes podem receber orçamentos');
      }

      // Verificar se o profissional existe
      const professional = await User.findById(quoteData.professionalId);
      if (!professional || professional.role !== 'professional') {
        throw badRequest('Profissional não encontrado');
      }

      // Verificar se já existe orçamento do mesmo profissional para este serviço
      const existingQuote = await Quote.findOne({
        serviceId: quoteData.serviceId,
        professionalId: quoteData.professionalId,
        status: { $in: ['pending', 'accepted'] }
      });

      if (existingQuote) {
        throw badRequest('Você já enviou um orçamento para este serviço');
      }

      const quote = new Quote(quoteData);
      await quote.save();

      // Criar notificação para o cliente
      await (Notification as any).createNotification(
        quoteData.clientId,
        'Novo Orçamento Recebido',
        `Você recebeu um novo orçamento para o serviço "${service.title}"`,
        'quote_received',
        { quoteId: quote._id, serviceId: service._id }
      );

      return quote;
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamento por ID
  static async getQuoteById(quoteId: string): Promise<IQuote> {
    try {
      const quote = await Quote.findById(quoteId)
        .populate('serviceId', 'title description category status')
        .populate('professionalId', 'name email phone avatar rating')
        .populate('clientId', 'name email phone');

      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      return quote;
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamentos por serviço
  static async getQuotesByService(serviceId: string, userId: string): Promise<IQuote[]> {
    try {
      // Verificar se o serviço existe
      const service = await Service.findById(serviceId);
      if (!service) {
        throw notFound('Serviço não encontrado');
      }

      // Verificar se o usuário tem permissão (dono do serviço ou profissional)
      const user = await User.findById(userId);
      const isClient = service.clientId.toString() === userId;
      const isProfessional = user?.role === 'professional';

      if (!isClient && !isProfessional) {
        throw forbidden('Você não tem permissão para ver esses orçamentos');
      }

      // Se for profissional, retornar apenas seus próprios orçamentos para este serviço
      const filter: any = { serviceId };
      if (isProfessional) {
        filter.professionalId = userId;
      }

      const quotes = await Quote.find(filter)
        .sort({ createdAt: -1 })
        .populate('professionalId', 'name email phone avatar rating');

      return quotes;
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamentos do cliente
  static async getClientQuotes(clientId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    serviceId?: string;
  } = {}): Promise<{ quotes: IQuote[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status, serviceId } = options;
      const skip = (page - 1) * limit;

      const filter: any = { clientId };
      if (status) filter.status = status;
      if (serviceId) filter.serviceId = serviceId;
      filter.validUntil = { $gte: new Date() };

      const [quotes, total] = await Promise.all([
        Quote.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('serviceId', 'title description category status clientId')
          .populate({
            path: 'serviceId',
            populate: {
              path: 'clientId',
              select: 'name email phone avatar'
            }
          })
          .populate('professionalId', 'name email phone avatar rating')
          .populate('clientId', 'name email phone'),
        Quote.countDocuments(filter)
      ]);

      return {
        quotes,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamentos do profissional
  static async getProfessionalQuotes(professionalId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    serviceId?: string;
  } = {}): Promise<{ quotes: IQuote[]; total: number; page: number; pages: number }> {
    try {
      const { page = 1, limit = 10, status, serviceId } = options;
      const skip = (page - 1) * limit;

      const filter: any = { professionalId };
      if (status) filter.status = status;
      if (serviceId) filter.serviceId = serviceId;
      filter.validUntil = { $gte: new Date() };

      const [quotes, total] = await Promise.all([
        Quote.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('serviceId', 'title description category status')
          .populate('clientId', 'name email phone'),
        Quote.countDocuments(filter)
      ]);

      return {
        quotes,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Aceitar orçamento
  static async acceptQuote(quoteId: string, clientId: string): Promise<IQuote> {
    try {
      const quote = await Quote.findOne({ _id: quoteId, clientId });
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (!quote.canBeAccepted) {
        throw badRequest('Orçamento não pode ser aceito (expirado ou já processado)');
      }

      // Aceitar o orçamento
      await quote.accept();

      // Rejeitar outros orçamentos pendentes para o mesmo serviço
      await Quote.updateMany(
        {
          serviceId: quote.serviceId,
          _id: { $ne: quoteId },
          status: 'pending'
        },
        { status: 'rejected' }
      );

      // NÃO atualizar status do serviço aqui - aguardar pagamento
      // O serviço só vai para 'in_progress' quando o pagamento for confirmado

      // Criar notificação para o profissional
      await (Notification as any).createNotification(
        quote.professionalId,
        'Orçamento Aceito',
        `Seu orçamento foi aceito pelo cliente`,
        'quote_accepted',
        { quoteId: quote._id, serviceId: quote.serviceId }
      );

      return quote;
    } catch (error) {
      throw error;
    }
  }

  // Rejeitar orçamento
  static async rejectQuote(quoteId: string, clientId: string): Promise<IQuote> {
    try {
      const quote = await Quote.findOne({ _id: quoteId, clientId });
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.status !== 'pending') {
        throw badRequest('Apenas orçamentos pendentes podem ser rejeitados');
      }

      await quote.reject();

      // Criar notificação para o profissional
      await (Notification as any).createNotification(
        quote.professionalId,
        'Orçamento Rejeitado',
        `Seu orçamento foi rejeitado pelo cliente`,
        'quote_rejected',
        { quoteId: quote._id, serviceId: quote.serviceId }
      );

      return quote;
    } catch (error) {
      throw error;
    }
  }

  // Atualizar orçamento
  static async updateQuote(quoteId: string, professionalId: string, updateData: Partial<IQuote>): Promise<IQuote> {
    try {
      const quote = await Quote.findOne({ _id: quoteId, professionalId });
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.status !== 'pending') {
        throw badRequest('Apenas orçamentos pendentes podem ser atualizados');
      }

      // Campos que podem ser atualizados
      const allowedFields = ['title', 'description', 'materials', 'labor', 'validUntil'];
      const updates: any = {};

      for (const field of allowedFields) {
        if (updateData[field as keyof IQuote] !== undefined) {
          updates[field] = updateData[field as keyof IQuote];
        }
      }

      const updatedQuote = await Quote.findByIdAndUpdate(
        quoteId,
        updates,
        { new: true, runValidators: true }
      );

      return updatedQuote!;
    } catch (error) {
      throw error;
    }
  }

  // Remover orçamento
  static async deleteQuote(quoteId: string, professionalId: string): Promise<void> {
    try {
      const quote = await Quote.findOne({ _id: quoteId, professionalId });
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.status !== 'pending') {
        throw badRequest('Apenas orçamentos pendentes podem ser removidos');
      }

      await Quote.findByIdAndDelete(quoteId);
    } catch (error) {
      throw error;
    }
  }

  // Processar pagamento do orçamento
  static async processPayment(quoteId: string, paymentData: {
    paymentMethod: string;
    paymentId?: string;
    transactionId?: string;
    creditCard?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    creditCardHolderInfo?: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      phone: string;
    };
  }): Promise<{ quote: IQuote; payment: any; pixCode?: string; qrCode?: string }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      // Validações básicas (outras estão no PaymentService também, mas bom manter aqui)
      if (quote.status !== 'accepted') {
        throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      }

      if (quote.paymentStatus === 'paid') {
        throw badRequest('Orçamento já foi pago');
      }

      let result: any;

      // Delegar para PaymentService baseado no método
      if (paymentData.paymentMethod === 'credit_card') {
        if (!paymentData.creditCard || !paymentData.creditCardHolderInfo) {
          throw badRequest('Dados do cartão e do titular são obrigatórios para crédito');
        }

        // Import dinâmico circular ou garantir que PaymentService está importado no topo
        const { PaymentService } = require('./paymentService');

        result = await PaymentService.processCreditCardPayment(
          quoteId,
          paymentData.creditCard,
          paymentData.creditCardHolderInfo,
          quote.clientId.toString()
        );

      } else if (paymentData.paymentMethod === 'pix') {
        const { PaymentService } = require('./paymentService');

        console.log('paymentData do usuário:', paymentData);
        // Reutiliza creditCardHolderInfo como payerInfo se disponível
        const payerInfo = paymentData.creditCardHolderInfo;
        result = await PaymentService.processPixPayment(quoteId, quote.clientId.toString(), payerInfo);

      } else {
        // Fallback para métodos manuais antigos ou erro
        // Por enquanto vamos lançar erro se não for um dos suportados pelo Asaas flow novo
        // Se quiser manter o suporte antigo a "mock", deixe aqui, mas o objetivo é migrar.
        throw badRequest('Método de pagamento não suportado ou inválido');
      }

      // Se o pagamento for confirmado imediatamente (ex: crédito sandbox), o PaymentService já atualiza o quote
      // Mas precisamos garantir que o status do serviço também atualize.
      // Recarregar quote para ver status
      const updatedQuote = await Quote.findById(quoteId);

      if (updatedQuote && updatedQuote.paymentStatus === 'paid') {
        await Service.findByIdAndUpdate(quote.serviceId, { status: 'in_progress' });

        // Notificações já são enviadas pelo PaymentService? 
        // O PaymentService atual não envia notificações, vamos adicionar aqui se necessário ou mover para lá.
        // A implementação anterior do QuoteService enviava. Vamos manter envio aqui se status mudou.

        await (Notification as any).createNotification(
          quote.professionalId,
          'Pagamento Recebido',
          `Você recebeu o pagamento do orçamento "${quote.title}". Pode iniciar o serviço.`,
          'payment_received',
          { quoteId: quote._id, paymentId: result.payment._id }
        );

        await (Notification as any).createNotification(
          quote.clientId,
          'Pagamento Confirmado',
          `Seu pagamento foi confirmado. O profissional será notificado para iniciar o serviço.`,
          'payment_confirmed',
          { quoteId: quote._id, paymentId: result.payment._id }
        );
      }

      return {
        quote: updatedQuote || quote,
        payment: result.payment,
        pixCode: result.pixCode,
        qrCode: result.qrCode
      };

    } catch (error) {
      throw error;
    }
  }

  // Obter estatísticas de orçamentos
  static async getQuoteStats(userId: string, userRole: string): Promise<{
    totalQuotes: number;
    pendingQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
    expiredQuotes: number;
    totalEarnings: number;
    averageQuoteValue: number;
  }> {
    try {
      const filter = userRole === 'client' ? { clientId: userId } : { professionalId: userId };

      const quotes = await Quote.find(filter);

      const stats = {
        totalQuotes: quotes.length,
        pendingQuotes: quotes.filter(q => q.status === 'pending').length,
        acceptedQuotes: quotes.filter(q => q.status === 'accepted').length,
        rejectedQuotes: quotes.filter(q => q.status === 'rejected').length,
        expiredQuotes: quotes.filter(q => q.status === 'expired').length,
        totalEarnings: quotes
          .filter(q => q.status === 'accepted' && q.paymentStatus === 'paid')
          .reduce((sum, q) => sum + q.totalPrice, 0),
        averageQuoteValue: quotes.length > 0
          ? quotes.reduce((sum, q) => sum + q.totalPrice, 0) / quotes.length
          : 0
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamentos próximos ao vencimento
  static async getExpiringQuotes(professionalId: string, days: number = 3): Promise<IQuote[]> {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);

      const quotes = await Quote.find({
        professionalId,
        status: 'pending',
        validUntil: { $lte: expirationDate }
      })
        .populate('serviceId', 'title description')
        .populate('clientId', 'name email phone')
        .sort({ validUntil: 1 });

      return quotes;
    } catch (error) {
      throw error;
    }
  }

  // Buscar orçamentos com filtros avançados
  static async searchQuotes(searchParams: {
    userId: string;
    userRole: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ quotes: IQuote[]; total: number; page: number; pages: number }> {
    try {
      const {
        userId,
        userRole,
        status,
        minPrice,
        maxPrice,
        category,
        dateFrom,
        dateTo,
        page = 1,
        limit = 10
      } = searchParams;

      const skip = (page - 1) * limit;
      const filter: any = userRole === 'client' ? { clientId: userId } : { professionalId: userId };

      // Filtros específicos
      if (status) filter.status = status;
      if (minPrice || maxPrice) {
        filter.totalPrice = {};
        if (minPrice) filter.totalPrice.$gte = minPrice;
        if (maxPrice) filter.totalPrice.$lte = maxPrice;
      }
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = dateFrom;
        if (dateTo) filter.createdAt.$lte = dateTo;
      }

      const [quotes, total] = await Promise.all([
        Quote.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('serviceId', 'title description category')
          .populate(userRole === 'client' ? 'professionalId' : 'clientId', 'name email phone avatar'),
        Quote.countDocuments(filter)
      ]);

      // Filtrar por categoria se especificado
      let filteredQuotes = quotes;
      if (category) {
        filteredQuotes = quotes.filter(quote =>
          quote.serviceId && (quote.serviceId as any).category === category
        );
      }

      return {
        quotes: filteredQuotes,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }
}
