import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { QuoteService } from '../services/quoteService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class QuoteController {
  // Validações para criar orçamento
  static createQuoteValidation = [
    body('serviceId')
      .isMongoId()
      .withMessage('ID do serviço inválido'),
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Título deve ter entre 5 e 100 caracteres'),
    body('description')
      .optional(),
    body('validUntil')
      .isISO8601()
      .withMessage('Data de validade deve ser uma data válida'),
  ];

  // Validações para atualizar orçamento
  static updateQuoteValidation = [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Título deve ter entre 5 e 100 caracteres'),
    body('description')
      .optional(),
    body('validUntil')
      .optional()
      .isISO8601()
      .withMessage('Data de validade deve ser uma data válida'),
  ];

  // Criar orçamento
  static createQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const professionalId = (req as any).user._id;
    const { serviceId } = req.body;

    // Buscar o serviço para obter o clientId
    const { Service } = await import('../models');
    const service = await Service.findById(serviceId);
    if (!service) {
      throw notFound('Serviço não encontrado');
    }

    // Calcular totais antes de salvar
    const { materials, labor } = req.body;

    // Calcular total dos materiais
    const materialsTotal = materials ? materials.reduce((sum: number, material: any) => {
      if (material.name && material.name.trim() !== '') {
        return sum + (material.quantity * material.price);
      }
      return sum;
    }, 0) : 0;

    // Calcular total da mão de obra
    let laborTotal = 0;

    // Se o cliente enviou o total diretamente (orçamento simples), usamos ele
    if (labor && labor.total) {
      laborTotal = labor.total;
    }
    // Caso contrário, calculamos baseado em horas e preço (orçamento detalhado legado)
    else if (labor && labor.hours && labor.pricePerHour) {
      laborTotal = labor.hours * labor.pricePerHour;
    }

    const totalPrice = materialsTotal + laborTotal;

    console.log('🔧 Controller - Materials total:', materialsTotal);
    console.log('🔧 Controller - Labor total:', laborTotal);
    console.log('🔧 Controller - Total price:', totalPrice);

    const quoteData = {
      ...req.body,
      professionalId,
      clientId: service.clientId,
      totalPrice,
      labor: labor ? {
        ...labor,
        total: laborTotal
      } : undefined,
    };

    const quote = await QuoteService.createQuote(quoteData);

    res.status(201).json({
      success: true,
      message: 'Orçamento criado com sucesso',
      data: { quote },
    });
  });

  // Buscar orçamento por ID
  static getQuoteById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;

    const quote = await QuoteService.getQuoteById(quoteId);

    res.json({
      success: true,
      message: 'Orçamento encontrado',
      data: { quote },
    });
  });

  // Buscar orçamentos por serviço
  static getQuotesByService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;
    const userId = (req as any).user._id;

    const quotes = await QuoteService.getQuotesByService(serviceId, userId);

    res.json({
      success: true,
      message: 'Orçamentos encontrados',
      data: quotes,
    });
  });

  // Buscar orçamentos do cliente
  static getClientQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req as any).user._id;
    const { page, limit, status, serviceId } = req.query;

    const result = await QuoteService.getClientQuotes(clientId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      serviceId: serviceId as string,
    });

    res.json({
      success: true,
      message: 'Orçamentos encontrados',
      data: result.quotes || result,
    });
  });

  // Buscar orçamentos do profissional
  static getProfessionalQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const professionalId = (req as any).user._id;
    const { page, limit, status, serviceId } = req.query;

    const result = await QuoteService.getProfessionalQuotes(professionalId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      serviceId: serviceId as string,
    });

    res.json({
      success: true,
      message: 'Orçamentos encontrados',
      data: result.quotes || result,
    });
  });

  // Aceitar orçamento
  static acceptQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const clientId = (req as any).user._id;

    const quote = await QuoteService.acceptQuote(quoteId, clientId);

    res.json({
      success: true,
      message: 'Orçamento aceito com sucesso',
      data: { quote },
    });
  });

  // Rejeitar orçamento
  static rejectQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const clientId = (req as any).user._id;

    const quote = await QuoteService.rejectQuote(quoteId, clientId);

    res.json({
      success: true,
      message: 'Orçamento rejeitado',
      data: { quote },
    });
  });

  // Atualizar orçamento
  static updateQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const professionalId = (req as any).user._id;
    const updateData = req.body;

    // Calcular totais manualmente antes de enviar para o service
    const { materials, labor } = updateData;

    // Calcular total de materiais
    const materialsTotal = materials ? materials.reduce((sum: number, material: any) => {
      if (material.name && material.name.trim() !== '') {
        return sum + (material.quantity * material.price);
      }
      return sum;
    }, 0) : 0;

    // Calcular total de mão de obra
    let laborTotal = 0;
    if (labor && labor.hours && labor.pricePerHour) {
      laborTotal = labor.hours * labor.pricePerHour;
    }

    // Calcular preço total
    const totalPrice = materialsTotal + laborTotal;

    // Adicionar os totais calculados aos dados de atualização
    const finalUpdateData = {
      ...updateData,
      totalPrice,
      labor: labor ? {
        ...labor,
        total: laborTotal
      } : undefined,
    };

    const quote = await QuoteService.updateQuote(quoteId, professionalId, finalUpdateData);

    res.json({
      success: true,
      message: 'Orçamento atualizado com sucesso',
      data: { quote },
    });
  });

  // Remover orçamento
  static deleteQuote = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const professionalId = (req as any).user._id;

    await QuoteService.deleteQuote(quoteId, professionalId);

    res.json({
      success: true,
      message: 'Orçamento removido com sucesso',
    });
  });

  // Processar pagamento do orçamento
  static processPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const { paymentMethod, paymentId, transactionId, creditCard, creditCardHolderInfo } = req.body;

    if (!paymentMethod) {
      throw badRequest('Método de pagamento é obrigatório');
    }

    console.log('paymentMethod', paymentMethod);
    console.log('paymentId', paymentId);
    console.log('transactionId', transactionId);
    console.log('creditCard', creditCard);
    console.log('creditCardHolderInfo', creditCardHolderInfo);

    const result = await QuoteService.processPayment(quoteId, {
      paymentMethod,
      paymentId,
      transactionId,
      creditCard,
      creditCardHolderInfo,
    });

    res.json({
      success: true,
      message: 'Pagamento processado com sucesso',
      data: result,
    });
  });

  // Obter estatísticas de orçamentos
  static getQuoteStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const stats = await QuoteService.getQuoteStats(userId, userRole);

    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: { stats },
    });
  });

  // Buscar orçamentos próximos ao vencimento
  static getExpiringQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const professionalId = (req as any).user._id;
    const { days } = req.query;

    const quotes = await QuoteService.getExpiringQuotes(
      professionalId,
      days ? parseInt(days as string) : 3
    );

    res.json({
      success: true,
      message: 'Orçamentos próximos ao vencimento encontrados',
      data: { quotes },
    });
  });

  // Buscar orçamentos com filtros avançados
  static searchQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const {
      status,
      minPrice,
      maxPrice,
      category,
      dateFrom,
      dateTo,
      page,
      limit
    } = req.query;

    const result = await QuoteService.searchQuotes({
      userId,
      userRole,
      status: status as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      category: category as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Busca realizada com sucesso',
      data: result,
    });
  });

  // Buscar todos os orçamentos (admin)
  static getAllQuotes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, professionalId, clientId } = req.query;

    // Implementar busca de todos os orçamentos para admin
    res.json({
      success: true,
      message: 'Orçamentos encontrados',
      data: {
        quotes: [],
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 10,
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Obter estatísticas gerais de orçamentos (admin)
  static getGeneralQuoteStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas gerais
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalQuotes: 0,
        pendingQuotes: 0,
        acceptedQuotes: 0,
        rejectedQuotes: 0,
        expiredQuotes: 0,
        totalValue: 0,
        averageValue: 0,
        quotesByMonth: {},
      },
    });
  });
}

