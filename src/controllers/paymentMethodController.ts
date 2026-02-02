import { Request, Response } from 'express';
import { PaymentMethod } from '../models/PaymentMethod';
import { asyncHandler, notFound, badRequest } from '../middlewares/errorHandler';

export class PaymentMethodController {

    /**
     * Lista todos os métodos de pagamento do usuário
     */
    static list = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;

        const methods = await PaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: methods
        });
    });

    /**
     * Adiciona um novo cartão (simulado)
     */
    static create = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;
        const { holderName, number, expiryMonth, expiryYear, cvv, type = 'credit_card' } = req.body;

        // Validação básica simulada
        if (!number || number.length < 13) throw badRequest('Número do cartão inválido');
        if (!cvv || cvv.length < 3) throw badRequest('CVV inválido');

        // Simula tokenização
        const last4 = number.slice(-4);
        const token = `tok_mock_${Date.now()}_${last4}`;

        // Simula detecção de bandeira
        let brand = 'unknown';
        if (number.startsWith('4')) brand = 'visa';
        else if (number.startsWith('5')) brand = 'mastercard';
        else if (number.startsWith('3')) brand = 'amex';

        // Check if first method
        const count = await PaymentMethod.countDocuments({ userId });
        const isDefault = count === 0;

        const paymentMethod = await PaymentMethod.create({
            userId,
            type,
            last4,
            brand,
            token,
            expiryMonth,
            expiryYear,
            holderName,
            isDefault
        });

        res.status(201).json({
            success: true,
            data: paymentMethod
        });
    });

    /**
     * Remove um método de pagamento
     */
    static delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const method = await PaymentMethod.findOneAndDelete({ _id: id, userId });

        if (!method) {
            throw notFound('Método de pagamento não encontrado');
        }

        res.json({
            success: true,
            message: 'Método de pagamento removido com sucesso'
        });
    });

    /**
     * Define como padrão
     */
    static setDefault = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const method = await PaymentMethod.findOne({ _id: id, userId });

        if (!method) {
            throw notFound('Método de pagamento não encontrado');
        }

        // Desmarcar outros
        await PaymentMethod.updateMany(
            { userId, _id: { $ne: id } },
            { $set: { isDefault: false } }
        );

        method.isDefault = true;
        await method.save();

        res.json({
            success: true,
            data: method
        });
    });
}
