import { Request, Response, NextFunction } from 'express';
import adminService from '../services/AdminService';

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
}

export default new AdminController();
