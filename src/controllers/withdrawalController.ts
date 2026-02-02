import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { Withdrawal } from '../models/Withdrawal';
import { PaymentService } from '../services/paymentService';
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

        // Check balance
        const earnings = await PaymentService.getEarnings(userId, 'year'); // Get total earnings context
        // NOTE: In a real app, we would have a 'Wallet' model to track current balance properly.
        // For now, checking if requested amount is reasonable compared to total net earnings.
        // Ideally: const balance = await WalletService.getBalance(userId);

        // Simplification for this MVP: We won't block based on strict balance check since we don't have a Wallet transaction ledger yet,
        // but we can check if they have at least *some* earnings.
        if (earnings.netTotal < amount) {
            throw badRequest('Saldo insuficiente para realizar este saque.');
        }

        const withdrawal = new Withdrawal({
            professionalId: userId,
            amount,
            pixKey,
            bankAccount,
            status: 'pending'
        });

        await withdrawal.save();

        res.status(201).json({
            success: true,
            message: 'Solicitação de saque realizada com sucesso.',
            data: withdrawal
        });
    });

    static getWithdrawals = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user._id;

        const withdrawals = await Withdrawal.find({ professionalId: userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: withdrawals
        });
    });
}
