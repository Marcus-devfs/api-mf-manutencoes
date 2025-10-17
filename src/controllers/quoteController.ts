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
      .trim()
      .isLength({ min: 20, max: 1000 })
      .withMessage('Descrição deve ter entre 20 e 1000 caracteres'),
    body('materials')
      .isArray({ min: 1 })
      .withMessage('Pelo menos um material é obrigatório'),
    body('materials.*.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nome do material deve ter entre 2 e 100 caracteres'),
    body('materials.*.quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Quantidade deve ser maior que zero'),
    body('materials.*.unit')
      .isIn(['unidade', 'metro', 'metro_quadrado', 'metro_cubico', 'kg', 'litro', 'caixa', 'pacote'])
      .withMessage('Unidade inválida'),
    body('materials.*.price')
      .isFloat({ min: 0 })
      .withMessage('Preço deve ser maior ou igual a zero'),
    body('labor.description')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Descrição da mão de obra deve ter entre 10 e 200 caracteres'),
    body('labor.hours')
      .isFloat({ min: 0.5 })
      .withMessage('Horas devem ser pelo menos 0.5'),
    body('labor.pricePerHour')
      .isFloat({ min: 0 })
      .withMessage('Preço por hora deve ser maior ou igual a zero'),
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
      .optional()
      .trim()
      .isLength({ min: 20, max: 1000 })
      .withMessage('Descrição deve ter entre 20 e 1000 caracteres'),
    body('materials')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Pelo menos um material é obrigatório'),
    body('labor.description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Descrição da mão de obra deve ter entre 10 e 200 caracteres'),
    body('labor.hours')
      .optional()
      .isFloat({ min: 0.5 })
      .withMessage('Horas devem ser pelo menos 0.5'),
    body('labor.pricePerHour')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Preço por hora deve ser maior ou igual a zero'),
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

    const quoteData = {
      ...req.body,
      professionalId,
      clientId: service.clientId,
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
      data: result,
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
      data: result,
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

    const quote = await QuoteService.updateQuote(quoteId, professionalId, updateData);

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
    const { paymentMethod, paymentId, transactionId } = req.body;

    if (!paymentMethod) {
      throw badRequest('Método de pagamento é obrigatório');
    }

    const result = await QuoteService.processPayment(quoteId, {
      paymentMethod,
      paymentId,
      transactionId,
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
