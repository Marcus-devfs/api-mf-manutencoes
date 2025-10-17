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
        .populate('professionalId', 'name email phone avatar')
        .populate('clientId', 'name email phone');

      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      return quote;
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

      const [quotes, total] = await Promise.all([
        Quote.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('serviceId', 'title description category status')
          .populate('professionalId', 'name email phone avatar'),
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

      // Atualizar status do serviço
      await Service.findByIdAndUpdate(quote.serviceId, { status: 'in_progress' });

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
  }): Promise<{ quote: IQuote; payment: any }> {
    try {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw notFound('Orçamento não encontrado');
      }

      if (quote.status !== 'accepted') {
        throw badRequest('Apenas orçamentos aceitos podem ser pagos');
      }

      if (quote.paymentStatus === 'paid') {
        throw badRequest('Orçamento já foi pago');
      }

      // Marcar orçamento como pago
      await quote.markAsPaid(paymentData.paymentId || paymentData.transactionId || '');

      // Criar registro de pagamento
      const payment = new Payment({
        quoteId: quote._id,
        clientId: quote.clientId,
        professionalId: quote.professionalId,
        amount: quote.totalPrice,
        currency: 'BRL',
        status: 'completed',
        paymentMethod: paymentData.paymentMethod,
        stripePaymentIntentId: paymentData.paymentId,
        transactionId: paymentData.transactionId,
      });

      await payment.save();

      // Criar notificação para o profissional
      await (Notification as any).createNotification(
        quote.professionalId,
        'Pagamento Recebido',
        `Você recebeu o pagamento do orçamento "${quote.title}"`,
        'payment_received',
        { quoteId: quote._id, paymentId: payment._id }
      );

      return { quote, payment };
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
