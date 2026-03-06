import { Router } from 'express';
import adminController from '../controllers/AdminController';
import { authenticateToken, requireAdmin } from '../middlewares';

const router = Router();

// Dashboard stats route
// Protected route: only authenticated users with 'admin' role can access
router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardStats);

// Services route
router.get('/services', authenticateToken, requireAdmin, adminController.getServices);

// Quotes route
router.get('/quotes', authenticateToken, requireAdmin, adminController.getQuotes);

// Single Service route
router.get('/services/:id', authenticateToken, requireAdmin, adminController.getServiceById);

// Single Quote route
router.get('/quotes/:id', authenticateToken, requireAdmin, adminController.getQuoteById);

// Payments routes
router.get('/payments', authenticateToken, requireAdmin, adminController.getPayments);
router.get('/payments/stats', authenticateToken, requireAdmin, adminController.getPaymentStats);
router.get('/payments/:id', authenticateToken, requireAdmin, adminController.getPaymentById);

export default router;
