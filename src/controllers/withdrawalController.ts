import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { WithdrawalService } from '../services/withdrawalService';
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

    static requestWithdrawal = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user._id;
        const { amount, pixKey, bankAccount } = req.body;

        if (!pixKey && !bankAccount) {
            throw badRequest('É necessário informar uma chave PIX ou conta bancária.');
        }

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
