import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { UserService } from '../services/userService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class UserController {
  // Validações para atualizar perfil
  static updateProfileValidation = [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nome deve ter entre 2 e 50 caracteres'),
    body('phone')
      .optional()
      .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
      .withMessage('Telefone deve estar no formato (XX) XXXXX-XXXX'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar deve ser uma URL válida'),
  ];

  // Validações para endereço
  static addressValidation = [
    body('title')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Título deve ter entre 2 e 50 caracteres'),
    body('street')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Rua deve ter entre 2 e 100 caracteres'),
    body('number')
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Número deve ter entre 1 e 10 caracteres'),
    body('neighborhood')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Bairro deve ter entre 2 e 50 caracteres'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Cidade deve ter entre 2 e 50 caracteres'),
    body('state')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Estado deve ter 2 caracteres'),
    body('zipCode')
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage('CEP deve estar no formato XXXXX-XXX'),
    body('complement')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Complemento deve ter no máximo 50 caracteres'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault deve ser um booleano'),
  ];

  // Validações para perfil profissional
  static professionalProfileValidation = [
    body('bio')
      .optional()
      .trim()
      .isLength({ min: 50, max: 500 })
      .withMessage('Biografia deve ter entre 50 e 500 caracteres'),
    body('specialties')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Especialidades são obrigatórias'),
    body('specialties.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Cada especialidade deve ter entre 2 e 50 caracteres'),
    body('experience')
      .optional()
      .isInt({ min: 0, max: 50 })
      .withMessage('Experiência deve ser entre 0 e 50 anos'),
    body('serviceRadius')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Raio de atendimento deve ser entre 1 e 100 km'),
  ];

  // Buscar usuário por ID
  static getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    const user = await UserService.getUserById(userId);

    res.json({
      success: true,
      message: 'Usuário encontrado',
      data: { user },
    });
  });

  // Atualizar perfil
  static updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const updateData = req.body;

    const user = await UserService.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: { user },
    });
  });

  // Desativar conta
  static deactivateAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const user = await UserService.deactivateAccount(userId);

    res.json({
      success: true,
      message: 'Conta desativada com sucesso',
      data: { user },
    });
  });

  // Reativar conta
  static reactivateAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    const user = await UserService.reactivateAccount(userId);

    res.json({
      success: true,
      message: 'Conta reativada com sucesso',
      data: { user },
    });
  });

  // Buscar endereços do usuário
  static getUserAddresses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const addresses = await UserService.getUserAddresses(userId);

    res.json({
      success: true,
      message: 'Endereços encontrados',
      data: { addresses },
    });
  });

  // Adicionar endereço
  static addAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const addressData = req.body;

    const address = await UserService.addAddress(userId, addressData);

    res.status(201).json({
      success: true,
      message: 'Endereço adicionado com sucesso',
      data: { address },
    });
  });

  // Atualizar endereço
  static updateAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;
    const userId = (req as any).user._id;
    const updateData = req.body;

    const address = await UserService.updateAddress(addressId, userId, updateData);

    res.json({
      success: true,
      message: 'Endereço atualizado com sucesso',
      data: { address },
    });
  });

  // Remover endereço
  static removeAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;
    const userId = (req as any).user._id;

    await UserService.removeAddress(addressId, userId);

    res.json({
      success: true,
      message: 'Endereço removido com sucesso',
    });
  });

  // Definir endereço padrão
  static setDefaultAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.params;
    const userId = (req as any).user._id;

    const address = await UserService.setDefaultAddress(addressId, userId);

    res.json({
      success: true,
      message: 'Endereço padrão definido com sucesso',
      data: { address },
    });
  });

  // Buscar perfil profissional
  static getProfessionalProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    const profile = await UserService.getProfessionalProfile(userId);

    res.json({
      success: true,
      message: 'Perfil profissional encontrado',
      data: { profile },
    });
  });

  // Criar perfil profissional
  static createProfessionalProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const profileData = req.body;

    const profile = await UserService.createProfessionalProfile(userId, profileData);

    res.status(201).json({
      success: true,
      message: 'Perfil profissional criado com sucesso',
      data: { profile },
    });
  });

  // Atualizar perfil profissional
  static updateProfessionalProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const updateData = req.body;

    const profile = await UserService.updateProfessionalProfile(userId, updateData);

    res.json({
      success: true,
      message: 'Perfil profissional atualizado com sucesso',
      data: { profile },
    });
  });

  // Buscar profissionais próximos
  static getNearbyProfessionals = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      throw badRequest('Latitude e longitude são obrigatórias');
    }

    const professionals = await UserService.getNearbyProfessionals(
      parseFloat(lat as string),
      parseFloat(lng as string),
      radius ? parseFloat(radius as string) : 10
    );

    res.json({
      success: true,
      message: 'Profissionais encontrados',
      data: { professionals },
    });
  });

  // Buscar profissionais por especialidade
  static getProfessionalsBySpecialty = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { specialty } = req.params;

    const professionals = await UserService.getProfessionalsBySpecialty(specialty);

    res.json({
      success: true,
      message: 'Profissionais encontrados',
      data: { professionals },
    });
  });

  // Avaliar profissional
  static rateProfessional = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { professionalId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw badRequest('Avaliação deve estar entre 1 e 5');
    }

    const profile = await UserService.rateProfessional(professionalId, rating, comment);

    res.json({
      success: true,
      message: 'Avaliação enviada com sucesso',
      data: { profile },
    });
  });

  // Buscar usuários (admin)
  static getUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10, role, isActive } = req.query;

    // Implementar busca de usuários com filtros
    // Por enquanto, retornar lista vazia
    res.json({
      success: true,
      message: 'Usuários encontrados',
      data: {
        users: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Buscar estatísticas de usuários (admin)
  static getUserStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas de usuários
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalUsers: 0,
        activeUsers: 0,
        clients: 0,
        professionals: 0,
        newUsersThisMonth: 0,
      },
    });
  });
}

