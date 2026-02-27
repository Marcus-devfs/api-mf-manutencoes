import { Review, IReview } from '../models/Review';
import { Service } from '../models/Service';
import { ProfessionalProfile } from '../models/ProfessionalProfile';

export class ReviewService {
    /**
     * Cria uma nova avaliação para um serviço
     */
    async createReview(
        serviceId: string,
        professionalId: string,
        clientId: string,
        rating: number,
        comment?: string
    ): Promise<IReview> {
        // 1. Validar Serviço
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new Error('Serviço não encontrado');
        }

        // 2. Verificar permissão (apenas o cliente do serviço pode avaliar)
        // service.clientId pode ser string ou objeto populado
        const serviceClientId = typeof service.clientId === 'object'
            ? (service.clientId as any)._id.toString()
            : service.clientId.toString();

        if (serviceClientId !== clientId.toString()) {
            console.log(`[ReviewService] Permission denied: ServiceClient=${serviceClientId} vs User=${clientId}`);
            throw new Error('Apenas o cliente do serviço pode avaliá-lo do serviço');
        }

        // 3. Verificar duplicidade
        const existingReview = await Review.findOne({ serviceId, clientId });
        if (existingReview) {
            throw new Error('Você já avaliou este serviço');
        }

        // 4. Criar Avaliação
        const review = await Review.create({
            serviceId,
            professionalId,
            clientId,
            rating,
            comment,
        });

        // 5. Atualizar média do profissional (assíncrono, não bloqueante para o retorno mas importante)
        await this.updateProfessionalRating(professionalId);

        return review;
    }

    /**
     * Atualiza a nota média do profissional
     */
    private async updateProfessionalRating(professionalId: string): Promise<void> {
        try {
            const allReviews = await Review.find({ professionalId });

            if (allReviews.length > 0) {
                const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / allReviews.length;

                await ProfessionalProfile.findOneAndUpdate(
                    { userId: professionalId },
                    {
                        rating: parseFloat(averageRating.toFixed(1)),
                        // totalJobs: allReviews.length 
                    }
                );
            }
        } catch (error) {
            console.error(`Erro ao atualizar média do profissional ${professionalId}:`, error);
        }
    }

    /**
     * Busca avaliações de um profissional
     */
    async getProfessionalReviews(professionalId: string): Promise<IReview[]> {
        return Review.find({ professionalId }).sort({ createdAt: -1 });
    }
}

export const reviewService = new ReviewService();
