import axios from 'axios';
import { User } from '../models';
import { config } from '../config/config';

// Definição das interfaces do Asaas (Simplificadas)
interface IAsaasCustomer {
    name: string;
    email: string;
    cpfCnpj?: string;
    mobilePhone?: string;
    externalReference?: string;
}

interface IAsaasSplit {
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
}

interface IAsaasPayment {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    split?: IAsaasSplit[];
}

export class AsaasService {
    private static api = axios.create({
        baseURL: process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3',
        headers: {
            'access_token': process.env.ASAAS_API_KEY || '',
            'Content-Type': 'application/json',
        },
    });

    // Criar ou Atualizar Cliente no Asaas
    static async createCustomer(userId: string): Promise<string> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Usuário não encontrado');

            if (user.asaasCustomerId) {
                return user.asaasCustomerId;
            }

            // Buscar se já existe no Asaas pelo email
            const { data: existing } = await this.api.get(`/customers?email=${user.email}`);

            if (existing.data && existing.data.length > 0) {
                user.asaasCustomerId = existing.data[0].id;
                await user.save();
                return user.asaasCustomerId as string;
            }

            // Criar novo cliente
            const customerData: IAsaasCustomer = {
                name: user.name,
                email: user.email,
                mobilePhone: user.phone || '99999999999', // Fallback se não tiver
                externalReference: user._id.toString()
            };

            const { data: newCustomer } = await this.api.post('/customers', customerData);
            user.asaasCustomerId = newCustomer.id;
            await user.save();

            return newCustomer.id;
        } catch (error: any) {
            console.error('Erro ao criar cliente Asaas:', error.response?.data || error.message);
            throw new Error('Falha na integração com Asaas (Cliente)');
        }
    }

    // Criar Conta do Profissional (Subconta para Split)
    static async createProfessionalAccount(userId: string): Promise<string> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('Usuário não encontrado');

            if (user.asaasAccountId) {
                return user.asaasAccountId;
            }

            const accountData = {
                name: user.name,
                email: user.email,
                cpfCnpj: '00000000000', // Em produção, precisa vir do cadastro do user
                mobilePhone: user.phone || '99999999999',
                incomeValue: 0,
                address: 'Rua Teste',
                addressNumber: '123',
                province: 'Bairro',
                postalCode: '00000-000'
            };

            const { data: newAccount } = await this.api.post('/accounts', accountData);
            user.asaasAccountId = newAccount.id;
            await user.save();

            return newAccount.id;

        } catch (error: any) {
            console.error('Erro ao criar conta profissional Asaas:', error.response?.data || error.message);
            throw new Error('Falha na integração com Asaas (Conta Profissional)');
        }
    }

    // Criar Cobrança com Split
    static async createPayment(
        customerId: string,
        value: number,
        professionalWalletId: string,
        description: string,
        reference: string
    ): Promise<any> {
        try {
            const payload: IAsaasPayment = {
                customer: customerId,
                billingType: 'PIX', // Focando em PIX inicialmente
                value: value,
                dueDate: new Date().toISOString().split('T')[0], // Vence hoje
                description: description,
                externalReference: reference,
                split: [
                    {
                        walletId: professionalWalletId,
                        percentualValue: 90 // 90% para o profissional
                    },
                    {
                        walletId: process.env.ASAAS_WALLET_ID || '', // 10% para a plataforma
                        percentualValue: 10
                    }
                ]
            };

            const { data } = await this.api.post('/payments', payload);
            return data;

        } catch (error: any) {
            console.error('Erro ao criar pagamento Asaas:', error.response?.data || error.message);
            throw new Error('Falha na integração com Asaas (Pagamento)');
        }
    }
}
