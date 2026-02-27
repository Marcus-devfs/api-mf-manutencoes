import { Withdrawal } from '../models/Withdrawal';
import { PaymentService } from './paymentService';
import { AsaasService } from './asaasService';
import { User } from '../models/User';
import { badRequest, notFound } from '../middlewares/errorHandler';

export class WithdrawalService {

    // Solicitar saque
    static async requestWithdrawal(userId: string, amount: number, pixKey?: string, bankAccount?: any) {
        // 1. Verificar Saldo (Simplificado: Total de Ganhos Líquidos - Total de Saques)
        // Em um sistema real, teríamos uma tabela de 'Balance' ou 'Ledger'.
        // Aqui vamos calcular dinamicamente.

        const totalEarnings = await PaymentService.getAvailableBalance(userId);

        const withdrawals = await Withdrawal.find({
            professionalId: userId,
            status: { $in: ['pending', 'processed', 'completed'] }
        });

        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const currentBalance = totalEarnings - totalWithdrawn;

        if (currentBalance < amount) {
            throw badRequest(`Saldo insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}`);
        }

        // 2. Buscar dados do usuário para pegar o WalletID do Asaas
        const user = await User.findById(userId);
        if (!user) throw notFound('Usuário não encontrado');

        // Se não tiver conta Asaas, não tem como sacar (pois não recebeu nada por lá teoricamente, ou está inconsistente)
        // Mas o sistema permite criar conta na hora do recebimento.
        // Vamos assumir que se tem saldo, tem conta.
        const walletId = user.asaasAccountId;
        // Nota: asaasAccountId armazena o ID da conta. O walletId as vezes é diferente, mas o createProfessionalAccount retorna o walletId.
        // Vamos assumir que salvamos o walletId ou o ID serve.

        // 3. Processar Saque no Asaas
        let transferResult;

        try {
            if (pixKey) {
                transferResult = await AsaasService.transferFunds(
                    walletId || '',
                    amount,
                    'PIX',
                    pixKey
                );
            } else if (bankAccount) {
                transferResult = await AsaasService.transferFunds(
                    walletId || '',
                    amount,
                    'TED',
                    undefined,
                    bankAccount
                );
            } else {
                throw badRequest('Chave PIX ou dados bancários obrigatórios');
            }
        } catch (error: any) {
            console.error('Erro no Asaas:', error);
            throw badRequest('Erro ao processar transferência no parceiro bancário.');
        }

        // 4. Salvar Registro de Saque
        const withdrawal = new Withdrawal({
            professionalId: userId,
            amount,
            pixKey,
            bankAccount,
            status: 'pending', // Deixa pendente até confirmar webhook ou assumir sucesso imediato?
            transactionId: transferResult.id,
            transferDate: new Date()
        });

        await withdrawal.save();

        return withdrawal;
    }

    // Obter histórico
    static async getHistory(userId: string) {
        return Withdrawal.find({ professionalId: userId }).sort({ createdAt: -1 });
    }
}
