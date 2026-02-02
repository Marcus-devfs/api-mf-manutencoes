import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    serviceId: string;
    professionalId: string;
    clientId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema({
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: 'Service',
        required: [true, 'ID do serviço é obrigatório'],
    },
    professionalId: {
        type: String, // Usando String pois User IDs são strings/sub
        required: [true, 'ID do profissional é obrigatório'],
        ref: 'User',
    },
    clientId: {
        type: String, // Usando String pois User IDs são strings/sub
        required: [true, 'ID do cliente é obrigatório'],
        ref: 'User',
    },
    rating: {
        type: Number,
        required: [true, 'Nota é obrigatória'],
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comentário deve ter no máximo 500 caracteres'],
    },
}, {
    timestamps: true,
});

// Index composto para garantir que um cliente só avalie um serviço uma vez
reviewSchema.index({ serviceId: 1, clientId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
