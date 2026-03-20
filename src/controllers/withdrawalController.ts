import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { WithdrawalService } from '../services/withdrawalService';
import { AsaasService } from '../services/asaasService';
import { User } from '../models';
import { Payment } from '../models/Payment';
import { asyncHandler, badRequest } from '../middlewares/errorHandler';

export class WithdrawalController {

    static validationRules = [
        body('amount')
            .isFloat({ min: 10 })
            .withMessage('O valor mínimo para saque é R$ 10,00'),
        body('pixKey')
            .optional()
            .notEmpty()
            .withMessage('Chave PIX inválida'),
    ];

    static getBalance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user._id;
        const user = await User.findById(userId).select('+asaasApiKey');

        const balance = user?.asaasApiKey
            ? await AsaasService.getSubAccountBalance(user.asaasApiKey)
            : 0;

        // Pagamentos completados cujo valor ainda não foi liberado (availableAt no futuro)
        const now = new Date();
        const pendingPayments = await Payment.find({
            professionalId: userId.toString(),
            status: 'completed',
            availableAt: { $gt: now },
        }).select('netAmount availableAt paymentMethod createdAt').sort({ availableAt: 1 });

        const pendingBalance = pendingPayments.reduce((sum, p) => sum + (p.netAmount || 0), 0);

        res.json({
            success: true,
            data: {
                balance,
                pendingBalance,
                pendingPayments: pendingPayments.map(p => ({
                    amount: p.netAmount,
                    availableAt: p.availableAt,
                    paymentMethod: p.paymentMethod,
                    createdAt: p.createdAt,
                })),
            }
        });
    });

    static requestWithdrawal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user._id;
        const { amount, pixKey, bankAccount } = req.body;

        const withdrawal = await WithdrawalService.requestWithdrawal(userId, amount, pixKey, bankAccount);

        res.status(201).json({
            success: true,
            message: 'Solicitação de saque realizada com sucesso.',
            data: withdrawal
        });
    });

    static getWithdrawals = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user._id;

        const withdrawals = await WithdrawalService.getHistory(userId);

        res.json({
            success: true,
            data: withdrawals
        });
    });
}
