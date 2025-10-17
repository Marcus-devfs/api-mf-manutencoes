import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { 
  authenticateToken, 
  requireVerification,
  requireClientOrProfessional,
  requireAdmin,
  apiLimiter 
} from '../middlewares';
import { handleValidationErrors, validatePagination } from '../middlewares/validation';

const router = Router();

// Aplicar rate limiting e autenticação em todas as rotas
router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

// Rotas para usuários
router.get('/my-notifications', 
  requireClientOrProfessional,
  validatePagination,
  NotificationController.getUserNotifications
);

router.get('/unread/count', 
  requireClientOrProfessional,
  NotificationController.getUnreadCount
);

router.get('/:notificationId', 
  requireClientOrProfessional,
  NotificationController.getNotificationById
);

router.patch('/:notificationId/read', 
  requireClientOrProfessional,
  NotificationController.markAsRead
);

router.patch('/all/read', 
  requireClientOrProfessional,
  NotificationController.markAllAsRead
);

router.delete('/:notificationId', 
  requireClientOrProfessional,
  NotificationController.deleteNotification
);

router.delete('/read/all', 
  requireClientOrProfessional,
  NotificationController.deleteReadNotifications
);

router.get('/stats/overview', 
  requireClientOrProfessional,
  NotificationController.getNotificationStats
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  validatePagination,
  NotificationController.getAllNotifications
);

router.get('/admin/stats/overview', 
  requireAdmin,
  NotificationController.getGeneralNotificationStats
);

router.post('/admin/create', 
  requireAdmin,
  NotificationController.createNotificationValidation,
  handleValidationErrors,
  NotificationController.createNotification
);

router.post('/admin/send-bulk', 
  requireAdmin,
  NotificationController.sendBulkNotification
);

router.post('/admin/send-push', 
  requireAdmin,
  NotificationController.sendPushNotification
);

router.post('/admin/send-email', 
  requireAdmin,
  NotificationController.sendEmailNotification
);

router.post('/admin/send-sms', 
  requireAdmin,
  NotificationController.sendSmsNotification
);

export default router;

