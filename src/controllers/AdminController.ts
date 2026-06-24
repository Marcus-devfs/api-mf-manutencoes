import { Request, Response, NextFunction } from 'express';
import adminService from '../services/AdminService';
import { PaymentService } from '../services/paymentService';
import { ServiceService } from '../services/serviceService';

export class AdminController {
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getDashboardStats();

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    async getServices(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getServices(req.query);

            res.status(200).json({
                success: true,
                message: 'Serviços encontrados',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
    async getQuotes(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getQuotes(req.query);

            res.status(200).json({
                success: true,
                message: 'Orçamentos encontrados',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getServiceById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getServiceById(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Serviço encontrado',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getQuoteById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getQuoteById(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Orçamento encontrado',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getPayments(req.query);

            res.status(200).json({
                success: true,
                message: 'Pagamentos encontrados',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getPaymentStats(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getPaymentStats();

            res.status(200).json({
                success: true,
                message: 'Estatísticas de pagamentos obtidas',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getPaymentById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getPaymentById(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Pagamento encontrado',
                data: { payment: result }
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserQuotes(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getUserQuotes(req.params.id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserServices(req: Request, res: Response, next: NextFunction) {
        try {
            const { role } = req.query;
            const result = await adminService.getUserServices(req.params.id, role as string);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getWithdrawals(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getWithdrawals(req.query);
            res.status(200).json({
                success: true,
                message: 'Saques encontrados',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async refundPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = (req as any).user._id;
            const userRole = (req as any).user.role;

            const payment = await PaymentService.processRefund(id, reason, userId, userRole);

            res.status(200).json({
                success: true,
                message: 'Reembolso processado com sucesso',
                data: { payment }
            });
        } catch (error) {
            next(error);
        }
    }

    async cancelService(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const service = await ServiceService.adminCancelService(id, reason);

            res.status(200).json({
                success: true,
                message: 'Serviço cancelado com sucesso',
                data: service
            });
        } catch (error) {
            next(error);
        }
    }

    async getReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getReviews(req.query);
            res.status(200).json({
                success: true,
                message: 'Avaliações encontradas',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteReview(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.deleteReview(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Avaliação removida com sucesso',
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminController();
