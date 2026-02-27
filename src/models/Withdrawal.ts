import mongoose, { Document, Schema } from 'mongoose';

export interface IWithdrawal extends Document {
    professionalId: string;
    amount: number;
    status: 'pending' | 'processed' | 'rejected';
    pixKey?: string;
    bankAccount?: {
        bank: string;
        agency: string;
        account: string;
    };
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
        },
        amount: {
            type: Number,
            required: true,
            min: 10,
        },
        status: {
            type: String,
            enum: ['pending', 'processed', 'rejected'],
            default: 'pending',
        },
        pixKey: {
            type: String,
        },
        bankAccount: {
            bank: String,
            agency: String,
            account: String,
        },
        adminNote: String,
        processedAt: Date,
    },
    {
        timestamps: true,
    }
);

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
