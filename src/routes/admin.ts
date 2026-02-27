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

export default router;
