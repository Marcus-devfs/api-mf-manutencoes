import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { PaymentService } from '../services/paymentService';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class PaymentController {
  // Validações para pagamento Stripe
  static stripePaymentValidation = [
    body('quoteId')
      .isMongoId()
      .withMessage('ID do orçamento inválido'),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('ID do método de pagamento é obrigatório'),
  ];

  // Validações para pagamento PIX
  static pixPaymentValidation = [
    body('quoteId')
      .isMongoId()
      .withMessage('ID do orçamento inválido'),
  ];

  // Validações para transferência bancária
  static bankTransferValidation = [
    body('quoteId')
      .isMongoId()
      .withMessage('ID do orçamento inválido'),
    body('bankName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nome do banco deve ter entre 2 e 50 caracteres'),
    body('accountNumber')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('Número da conta deve ter entre 4 e 20 caracteres'),
    body('agency')
      .trim()
      .isLength({ min: 3, max: 10 })
      .withMessage('Agência deve ter entre 3 e 10 caracteres'),
  ];

  // Validações para confirmar pagamento
  static confirmPaymentValidation = [
    body('paymentId')
      .isMongoId()
      .withMessage('ID do pagamento inválido'),
    body('transactionId')
      .notEmpty()
      .withMessage('ID da transação é obrigatório'),
  ];

  // Validações para reembolso
  static refundValidation = [
    body('paymentId')
      .isMongoId()
      .withMessage('ID do pagamento inválido'),
    body('reason')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Motivo deve ter entre 10 e 200 caracteres'),
  ];

  // Processar pagamento com Stripe
  static processStripePayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId, paymentMethodId } = req.body;
    const clientId = (req as any).user._id;

    const result = await PaymentService.processStripePayment(quoteId, paymentMethodId, clientId);

    res.json({
      success: true,
      message: 'Pagamento processado com sucesso',
      data: result,
    });
  });

  // Processar pagamento PIX
  static processPixPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.body;
    const clientId = (req as any).user._id;

    const result = await PaymentService.processPixPayment(quoteId, clientId);

    res.json({
      success: true,
      message: 'Pagamento PIX criado com sucesso',
      data: result,
    });
  });

  // Confirmar pagamento PIX
  static confirmPixPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, transactionId } = req.body;

    const payment = await PaymentService.confirmPixPayment(paymentId, transactionId);

    res.json({
      success: true,
      message: 'Pagamento PIX confirmado com sucesso',
      data: { payment },
    });
  });

  // Processar transferência bancária
  static processBankTransfer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId, bankName, accountNumber, agency } = req.body;
    const clientId = (req as any).user._id;

    const result = await PaymentService.processBankTransfer(quoteId, clientId, {
      bankName,
      accountNumber,
      agency,
    });

    res.json({
      success: true,
      message: 'Transferência bancária processada com sucesso',
      data: result,
    });
  });

  // Confirmar transferência bancária
  static confirmBankTransfer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, transactionId, receiptUrl } = req.body;

    const payment = await PaymentService.confirmBankTransfer(paymentId, transactionId, receiptUrl);

    res.json({
      success: true,
      message: 'Transferência bancária confirmada com sucesso',
      data: { payment },
    });
  });

  // Buscar pagamentos do cliente
  static getClientPayments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req as any).user._id;
    const { page, limit, status, paymentMethod } = req.query;

    const result = await PaymentService.getClientPayments(clientId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      paymentMethod: paymentMethod as string,
    });

    res.json({
      success: true,
      message: 'Pagamentos encontrados',
      data: result,
    });
  });

  // Buscar pagamentos do profissional
  static getProfessionalPayments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const professionalId = (req as any).user._id;
    const { page, limit, status, paymentMethod } = req.query;

    const result = await PaymentService.getProfessionalPayments(professionalId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      paymentMethod: paymentMethod as string,
    });

    res.json({
      success: true,
      message: 'Pagamentos encontrados',
      data: result,
    });
  });

  // Buscar pagamento por ID
  static getPaymentById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId } = req.params;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const payment = await PaymentService.getPaymentById(paymentId, userId, userRole);

    res.json({
      success: true,
      message: 'Pagamento encontrado',
      data: { payment },
    });
  });

  // Processar reembolso
  static processRefund = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, reason } = req.body;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const payment = await PaymentService.processRefund(paymentId, reason, userId, userRole);

    res.json({
      success: true,
      message: 'Reembolso processado com sucesso',
      data: { payment },
    });
  });

  // Obter estatísticas de pagamentos
  static getPaymentStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    const stats = await PaymentService.getPaymentStats(userId, userRole);

    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: { stats },
    });
  });

  // Buscar todos os pagamentos (admin)
  static getAllPayments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, paymentMethod, clientId, professionalId } = req.query;

    // Implementar busca de todos os pagamentos para admin
    res.json({
      success: true,
      message: 'Pagamentos encontrados',
      data: {
        payments: [],
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 10,
          total: 0,
          pages: 0,
        },
      },
    });
  });

  // Obter estatísticas gerais de pagamentos (admin)
  static getGeneralPaymentStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implementar estatísticas gerais
    res.json({
      success: true,
      message: 'Estatísticas obtidas',
      data: {
        totalPayments: 0,
        totalAmount: 0,
        pendingPayments: 0,
        completedPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
        paymentsByMethod: {},
        paymentsByMonth: {},
        averagePaymentValue: 0,
      },
    });
  });

  // Webhook do Stripe (para confirmar pagamentos)
  static stripeWebhook = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      throw badRequest('Webhook secret não configurado');
    }

    // Aqui você processaria o webhook do Stripe
    // Por enquanto, apenas retornamos sucesso
    res.json({
      success: true,
      message: 'Webhook processado com sucesso',
    });
  });

  // Obter métodos de pagamento disponíveis
  static getPaymentMethods = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const paymentMethods = [
      {
        id: 'credit_card',
        name: 'Cartão de Crédito',
        description: 'Visa, Mastercard, American Express',
        icon: 'credit-card',
        available: true,
      },
      {
        id: 'pix',
        name: 'PIX',
        description: 'Pagamento instantâneo',
        icon: 'pix',
        available: true,
      },
      {
        id: 'bank_transfer',
        name: 'Transferência Bancária',
        description: 'TED, DOC, PIX',
        icon: 'bank',
        available: true,
      },
    ];

    res.json({
      success: true,
      message: 'Métodos de pagamento obtidos',
      data: { paymentMethods },
    });
  });
}
