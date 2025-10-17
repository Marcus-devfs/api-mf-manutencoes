import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { ServiceService } from '../services/serviceService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class ServiceController {
  // Validações para criar serviço
  static createServiceValidation = [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Título deve ter entre 5 e 100 caracteres'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 1000 })
      .withMessage('Descrição deve ter entre 20 e 1000 caracteres'),
    body('category')
      .isIn(['portas', 'janelas', 'moveis', 'reparos', 'instalacao', 'manutencao', 'restauracao', 'customizacao', 'outros'])
      .withMessage('Categoria inválida'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Imagens devem ser um array'),
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Cada imagem deve ser uma URL válida'),
    body('address.title')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Título do endereço deve ter entre 2 e 50 caracteres'),
    body('address.street')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Rua deve ter entre 2 e 100 caracteres'),
    body('address.number')
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Número deve ter entre 1 e 10 caracteres'),
    body('address.neighborhood')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Bairro deve ter entre 2 e 50 caracteres'),
    body('address.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Cidade deve ter entre 2 e 50 caracteres'),
    body('address.state')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Estado deve ter 2 caracteres'),
    body('address.zipCode')
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage('CEP deve estar no formato XXXXX-XXX'),
    body('budget.min')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Orçamento mínimo deve ser maior que zero'),
    body('budget.max')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Orçamento máximo deve ser maior que zero'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Prioridade deve ser low, medium ou high'),
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('Prazo deve ser uma data válida'),
  ];

  // Validações para atualizar serviço
  static updateServiceValidation = [
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
    body('category')
      .optional()
      .isIn(['portas', 'janelas', 'moveis', 'reparos', 'instalacao', 'manutencao', 'restauracao', 'customizacao', 'outros'])
      .withMessage('Categoria inválida'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Prioridade deve ser low, medium ou high'),
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('Prazo deve ser uma data válida'),
  ];

  // Criar serviço
  static createService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req as any).user._id;
    const serviceData = { ...req.body, clientId };

    const service = await ServiceService.createService(serviceData);

    res.status(201).json({
      success: true,
      message: 'Serviço criado com sucesso',
      data: { service },
    });
  });

  // Buscar serviço por ID
  static getServiceById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;

    const service = await ServiceService.getServiceById(serviceId);

    res.json({
      success: true,
      message: 'Serviço encontrado',
      data: { service },
    });
  });

  // Buscar serviços do cliente
  static getClientServices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req as any).user._id;
    const { page, limit, status, category } = req.query;

    const result = await ServiceService.getClientServices(clientId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      category: category as string,
    });

    res.json({
      success: true,
      message: 'Serviços encontrados',
      data: result,
    });
  });

  // Buscar serviços disponíveis para profissionais
  static getAvailableServices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, category, priority, lat, lng, radius } = req.query;

    const result = await ServiceService.getAvailableServices({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string,
      priority: priority as string,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Serviços disponíveis encontrados',
      data: result,
    });
  });

  // Atualizar serviço
  static updateService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;
    const clientId = (req as any).user._id;
    const updateData = req.body;

    const service = await ServiceService.updateService(serviceId, clientId, updateData);

    res.json({
      success: true,
      message: 'Serviço atualizado com sucesso',
      data: { service },
    });
  });

  // Cancelar serviço
  static cancelService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;
    const clientId = (req as any).user._id;
    const { reason } = req.body;

    const service = await ServiceService.cancelService(serviceId, clientId, reason);

    res.json({
      success: true,
      message: 'Serviço cancelado com sucesso',
      data: { service },
    });
  });

  // Marcar serviço como concluído
  static completeService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;
    const clientId = (req as any).user._id;

    const service = await ServiceService.completeService(serviceId, clientId);

    res.json({
      success: true,
      message: 'Serviço marcado como concluído',
      data: { service },
    });
  });

  // Buscar serviços por categoria
  static getServicesByCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { category } = req.params;
    const { page, limit, status } = req.query;

    const result = await ServiceService.getServicesByCategory(category, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
    });

    res.json({
      success: true,
      message: 'Serviços encontrados',
      data: result,
    });
  });

  // Buscar serviços próximos ao profissional
  static getServicesNearProfessional = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const professionalId = (req as any).user._id;
    const { page, limit, category, radius } = req.query;

    const result = await ServiceService.getServicesNearProfessional(professionalId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string,
      radius: radius ? parseFloat(radius as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Serviços próximos encontrados',
      data: result,
    });
  });

  // Obter estatísticas do serviço
  static getServiceStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { serviceId } = req.params;

    const stats = await ServiceService.getServiceStats(serviceId);

    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: { stats },
    });
  });

  // Buscar serviços com filtros avançados
  static searchServices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      query, 
      category, 
      status, 
      priority, 
      minBudget, 
      maxBudget, 
      lat, 
      lng, 
      radius,
      page, 
      limit 
    } = req.query;

    const result = await ServiceService.searchServices({
      query: query as string,
      category: category as string,
      status: status as string,
      priority: priority as string,
      minBudget: minBudget ? parseFloat(minBudget as string) : undefined,
      maxBudget: maxBudget ? parseFloat(maxBudget as string) : undefined,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Busca realizada com sucesso',
      data: result,
    });
  });

  // Buscar todos os serviços (admin)
  static getAllServices = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, category, clientId } = req.query;

    // Implementar busca de todos os serviços para admin
    res.json({
      success: true,
      message: 'Serviços encontrados',
      data: {
        services: [],
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 10,
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Obter estatísticas gerais de serviços (admin)
  static getGeneralServiceStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas gerais
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalServices: 0,
        pendingServices: 0,
        inProgressServices: 0,
        completedServices: 0,
        cancelledServices: 0,
        servicesByCategory: {},
        averageServiceValue: 0,
      },
    });
  });
}
