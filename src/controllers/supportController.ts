import { Request, Response } from 'express';
import { body } from 'express-validator';
import { Support } from '../models/Support';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';
import { handleValidationErrors } from '../middlewares/validation';

export class SupportController {
  static createTicketValidation = [
    body('subject')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Assunto deve ter entre 3 e 200 caracteres'),
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Mensagem deve ter entre 1 e 2000 caracteres'),
  ];

  static sendMessageValidation = [
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Mensagem deve ter entre 1 e 2000 caracteres'),
  ];

  // Usuário: criar ticket de suporte
  static createTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { subject, message } = req.body;

    const ticket = await Support.create({
      userId,
      subject,
      messages: [{ senderId: userId, senderRole: 'user', message }],
    });

    res.status(201).json({
      success: true,
      message: 'Ticket de suporte criado com sucesso',
      data: { ticket },
    });
  });

  // Usuário: listar meus tickets
  static getMyTickets = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Support.find({ userId }).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Support.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      message: 'Tickets encontrados',
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  });

  // Usuário: buscar ticket por ID
  static getMyTicketById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { ticketId } = req.params;

    const ticket = await Support.findOne({ _id: ticketId, userId });
    if (!ticket) throw notFound('Ticket não encontrado');

    res.json({
      success: true,
      message: 'Ticket encontrado',
      data: { ticket },
    });
  });

  // Usuário: enviar mensagem num ticket existente
  static sendUserMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { ticketId } = req.params;
    const { message } = req.body;

    const ticket = await Support.findOne({ _id: ticketId, userId });
    if (!ticket) throw notFound('Ticket não encontrado');

    if (ticket.status === 'closed') {
      throw badRequest('Este ticket está fechado. Abra um novo ticket para continuar.');
    }

    ticket.messages.push({ senderId: userId, senderRole: 'user', message, createdAt: new Date() });
    await ticket.save();

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { ticket },
    });
  });

  // Usuário: encerrar ticket
  static closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { ticketId } = req.params;

    const ticket = await Support.findOne({ _id: ticketId, userId });
    if (!ticket) throw notFound('Ticket não encontrado');

    if (ticket.status === 'closed') {
      throw badRequest('Este ticket já está encerrado.');
    }

    ticket.status = 'closed';
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket encerrado com sucesso',
      data: { ticket },
    });
  });

  // Admin: listar todos os tickets
  static getAllTickets = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    const [tickets, total] = await Promise.all([
      Support.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Support.countDocuments(filter),
    ]);

    // Populate user info
    const populatedTickets = await Support.populate(tickets, {
      path: 'userId',
      select: 'name email role avatar',
      model: 'User',
    });

    res.json({
      success: true,
      message: 'Tickets encontrados',
      data: {
        tickets: populatedTickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  });

  // Admin: buscar ticket por ID
  static getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;

    const ticket = await Support.findById(ticketId).populate('userId', 'name email role avatar');
    if (!ticket) throw notFound('Ticket não encontrado');

    res.json({
      success: true,
      message: 'Ticket encontrado',
      data: { ticket },
    });
  });

  // Admin: responder ticket
  static replyToTicket = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user._id;
    const { ticketId } = req.params;
    const { message } = req.body;

    const ticket = await Support.findById(ticketId);
    if (!ticket) throw notFound('Ticket não encontrado');

    ticket.messages.push({ senderId: adminId, senderRole: 'admin', message, createdAt: new Date() });

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    const populated = await ticket.populate('userId', 'name email role avatar');

    res.json({
      success: true,
      message: 'Resposta enviada com sucesso',
      data: { ticket: populated },
    });
  });

  // Admin: atualizar status do ticket
  static updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!['open', 'in_progress', 'closed'].includes(status)) {
      throw badRequest('Status inválido');
    }

    const ticket = await Support.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true }
    ).populate('userId', 'name email role avatar');

    if (!ticket) throw notFound('Ticket não encontrado');

    res.json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: { ticket },
    });
  });
}
