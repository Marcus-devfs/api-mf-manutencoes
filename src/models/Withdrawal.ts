import mongoose, { Document, Schema } from 'mongoose';

export interface IWithdrawal extends Document {
    professionalId: string;
    amount: number;          // valor solicitado
    fee: number;             // taxa cobrada (se houver)
    netAmount: number;       // valor líquido efetivamente transferido
    transferType: 'PIX' | 'TED';
    status: 'pending' | 'processed' | 'rejected';
    // PIX
    pixKey?: string;
    pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
    // TED / conta bancária
    bankAccount?: {
        bankCode: string;
        bankName?: string;
        agency: string;
        account: string;
        accountDigit: string;
        accountType: 'CONTA_CORRENTE' | 'CONTA_POUPANCA';
        ownerName: string;
        cpfCnpj: string;
    };
    // Asaas
    asaasTransferId?: string;
    asaasStatus?: string;    // status retornado pelo Asaas (PENDING, DONE, CANCELLED…)
    // Controle interno
    rejectionReason?: string;
    adminNote?: string;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
    {
        professionalId: {
            type: String,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 10,
        },
        fee: {
            type: Number,
            default: 0,
        },
        netAmount: {
            type: Number,
            default: 0,
        },
        transferType: {
            type: String,
            enum: ['PIX', 'TED'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processed', 'rejected'],
            default: 'pending',
            index: true,
        },
        pixKey: String,
        pixKeyType: {
            type: String,
            enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'],
        },
        bankAccount: {
            bankCode: String,
            bankName: String,
            agency: String,
            account: String,
            accountDigit: String,
            accountType: {
                type: String,
                enum: ['CONTA_CORRENTE', 'CONTA_POUPANCA'],
            },
            ownerName: String,
            cpfCnpj: String,
        },
        asaasTransferId: { type: String, index: true },
        asaasStatus: String,
        rejectionReason: String,
        adminNote: String,
        processedAt: Date,
    },
    {
        timestamps: true,
    }
);

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
