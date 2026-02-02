import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import serviceRoutes from './services';
import quoteRoutes from './quotes';
import chatRoutes from './chat';
import paymentRoutes from './payments';
import notificationRoutes from './notifications';
import pushNotificationRoutes from './pushNotification';
import uploadRoutes from './upload';
import reviewRoutes from './reviews';
import addressRoutes from './addresses';
import paymentMethodRoutes from './paymentMethods';

const router = Router();

// Rotas da API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/quotes', quoteRoutes);
router.use('/chat', chatRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push-notifications', pushNotificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/reviews', reviewRoutes);
router.use('/addresses', addressRoutes);

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API está funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
