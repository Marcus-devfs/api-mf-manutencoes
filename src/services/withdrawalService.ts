import { Withdrawal } from '../models/Withdrawal';
import { AsaasService } from './asaasService';
import { User } from '../models/User';
import { badRequest, notFound } from '../middlewares/errorHandler';

export class WithdrawalService {

    // Solicitar saque
    static async requestWithdrawal(userId: string, amount: number, pixKey?: string, bankAccount?: any) {
        if (!pixKey && !bankAccount) {
            throw badRequest('Chave PIX ou dados bancários obrigatórios');
        }

        // 1. Buscar usuário com a asaasApiKey (campo oculto por padrão, precisa do +)
        const user = await User.findById(userId).select('+asaasApiKey');
        if (!user) throw notFound('Usuário não encontrado');

        if (!user.asaasAccountId || !user.asaasApiKey) {
            throw badRequest('Conta Asaas do profissional não está configurada. Entre em contato com o suporte.');
        }

        // 2. Consultar saldo real no Asaas
        const asaasBalance = await AsaasService.getSubAccountBalance(user.asaasApiKey);

        if (asaasBalance < amount) {
            throw badRequest(`Saldo insuficiente na conta Asaas. Disponível: R$ ${asaasBalance.toFixed(2)}`);
        }

        // 3. Processar transferência no Asaas usando a API key da sub-conta
        let transferResult;
        try {
            if (pixKey) {
                transferResult = await AsaasService.transferFunds(
                    amount,
                    'PIX',
                    user.asaasApiKey,
                    pixKey
                );
            } else {
                transferResult = await AsaasService.transferFunds(
                    amount,
                    'TED',
                    user.asaasApiKey,
                    undefined,
                    bankAccount
                );
            }
        } catch (error: any) {
            console.error('Erro no Asaas:', error);
            throw badRequest(error.message || 'Erro ao processar transferência no parceiro bancário.');
        }

        // 4. Salvar registro de saque
        const WITHDRAWAL_FEE = 0; // taxa da plataforma por saque (ajuste se necessário)

        const withdrawal = new Withdrawal({
            professionalId: userId,
            amount,
            fee: WITHDRAWAL_FEE,
            netAmount: amount - WITHDRAWAL_FEE,
            transferType: pixKey ? 'PIX' : 'TED',
            pixKey: pixKey || undefined,
            pixKeyType: pixKey ? AsaasService.detectPixKeyType(pixKey) : undefined,
            bankAccount: bankAccount || undefined,
            status: 'pending',
            asaasTransferId: transferResult?.id || undefined,
            asaasStatus: transferResult?.status || undefined,
        });

        await withdrawal.save();

        return withdrawal;
    }

    // Obter histórico
    static async getHistory(userId: string) {
        return Withdrawal.find({ professionalId: userId }).sort({ createdAt: -1 });
    }
}
