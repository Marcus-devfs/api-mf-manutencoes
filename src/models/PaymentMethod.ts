import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentMethod extends Document {
    userId: string;
    type: 'credit_card' | 'debit_card';
    last4: string;
    brand: string;
    token: string; // Mock token or Stripe PaymentMethod ID
    expiryMonth: string;
    expiryYear: string;
    holderName: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>({
    userId: {
        type: String,
        required: [true, 'ID do usuário é obrigatório'],
        ref: 'User',
    },
    type: {
        type: String,
        required: true,
        enum: ['credit_card', 'debit_card'],
        default: 'credit_card',
    },
    last4: {
        type: String,
        required: true,
        minlength: 4,
        maxlength: 4,
    },
    brand: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    expiryMonth: {
        type: String,
        required: true,
    },
    expiryYear: {
        type: String,
        required: true,
    },
    holderName: {
        type: String,
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Index
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ isDefault: 1 });

// Middleware to ensure only one default per user
paymentMethodSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await mongoose.model('PaymentMethod').updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    next();
});

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
