import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { 
  authenticateToken, 
  requireVerification,
  requireClientOrProfessional,
  requireAdmin,
  apiLimiter,
  chatLimiter 
} from '../middlewares';
import { handleValidationErrors, validatePagination } from '../middlewares/validation';

const router = Router();

// Aplicar rate limiting e autenticação em todas as rotas
router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Rotas para gerenciar chats
router.get('/service/:serviceId/user/:userId2', 
  requireClientOrProfessional,
  ChatController.getOrCreateChat
);

router.get('/my-chats', 
  requireClientOrProfessional,
  validatePagination,
  ChatController.getUserChats
);

router.get('/:chatId', 
  requireClientOrProfessional,
  ChatController.getChatById
);

router.patch('/:chatId/archive', 
  requireClientOrProfessional,
  ChatController.archiveChat
);

router.patch('/:chatId/unarchive', 
  requireClientOrProfessional,
  ChatController.unarchiveChat
);

// Rotas para mensagens
router.post('/messages', 
  chatLimiter,
  ChatController.sendMessageValidation,
  handleValidationErrors,
  ChatController.sendMessage
);

router.get('/:chatId/messages', 
  requireClientOrProfessional,
  validatePagination,
  ChatController.getChatMessages
);

router.patch('/:chatId/messages/read', 
  requireClientOrProfessional,
  ChatController.markMessagesAsRead
);

router.put('/messages/:messageId', 
  chatLimiter,
  ChatController.editMessageValidation,
  handleValidationErrors,
  ChatController.editMessage
);

router.delete('/messages/:messageId', 
  requireClientOrProfessional,
  ChatController.deleteMessage
);

// Rotas para busca
router.get('/:chatId/search', 
  requireClientOrProfessional,
  ChatController.searchMessages
);

// Rotas para estatísticas
router.get('/stats/overview', 
  requireClientOrProfessional,
  ChatController.getChatStats
);

router.get('/unread/count', 
  requireClientOrProfessional,
  ChatController.getUnreadCount
);

router.get('/:chatId/unread/count', 
  requireClientOrProfessional,
  ChatController.getUnreadCountByChat
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  validatePagination,
  ChatController.getAllChats
);

router.get('/admin/stats/overview', 
  requireAdmin,
  ChatController.getGeneralChatStats
);

export default router;
