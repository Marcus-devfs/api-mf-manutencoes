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
}

export default new AdminController();
