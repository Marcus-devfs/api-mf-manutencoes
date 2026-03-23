import { Router } from 'express';
import { SupportController } from '../controllers/supportController';
import {
  authenticateToken,
  requireVerification,
  requireAdmin,
  apiLimiter,
} from '../middlewares';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Rotas do usuário (cliente e profissional)
router.post(
  '/',
  SupportController.createTicketValidation,
  handleValidationErrors,
  SupportController.createTicket
);

router.get('/my-tickets', SupportController.getMyTickets);

router.get('/my-tickets/:ticketId', SupportController.getMyTicketById);

router.post(
  '/my-tickets/:ticketId/messages',
  SupportController.sendMessageValidation,
  handleValidationErrors,
  SupportController.sendUserMessage
);

router.patch('/my-tickets/:ticketId/close', SupportController.closeTicket);

// Rotas administrativas
router.get('/admin/all', requireAdmin, SupportController.getAllTickets);

router.get('/admin/:ticketId', requireAdmin, SupportController.getTicketById);

router.post(
  '/admin/:ticketId/reply',
  requireAdmin,
  SupportController.sendMessageValidation,
  handleValidationErrors,
  SupportController.replyToTicket
);

router.patch('/admin/:ticketId/status', requireAdmin, SupportController.updateTicketStatus);

export default router;
