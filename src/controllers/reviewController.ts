import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { reviewService } from '../services/reviewService';
import { asyncHandler, notFound, badRequest } from '../middlewares';

export class ReviewController {

    // Validações para criação de avaliação
    static createReviewValidation = [
        body('serviceId')
            .isMongoId()
            .withMessage('ID do serviço inválido'),
        body('professionalId')
            .isString()
            .notEmpty()
            .withMessage('ID do profissional é obrigatório'),
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Avaliação deve ser um número inteiro entre 1 e 5'),
        body('comment')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Comentário deve ter no máximo 500 caracteres'),
    ];

    /**
     * Cria uma nova avaliação
     */
    static create = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { serviceId, professionalId, rating, comment } = req.body;
        const clientId = (req as any).user._id;

        // O service já faz as validações de negócio
        try {
            const review = await reviewService.createReview(
                serviceId,
                professionalId,
                clientId,
                Number(rating),
                comment
            );

            res.status(201).json({
                success: true,
                data: review,
            });
        } catch (error: any) {
            // Mapear erros de negócio para respostas HTTP adequadas se necessário
            // Ou deixar o errorHandler global tratar (se for erro desconhecido)
            if (error.message === 'Serviço não encontrado') {
                throw notFound(error.message);
            }
            if (error.message.includes('Apenas o cliente') || error.message.includes('já avaliou')) {
                // 403 Forbidden ou 400 Bad Request? O controller anterior usava 403 e 400.
                // Vou usar badRequest para coisas como "já avaliou" e maybe forbidden para permissão.
                // Por simplicidade, vou jogar o erro e deixar o global handler ou tratar aqui.
                // O ideal seria criar erros customizados (ForbiddenError, etc).
                // Como meu errorHandler (visto em quoteController imports) tem badRequest e notFound, vou usar badRequest.
                throw badRequest(error.message);
            }
            throw error;
        }
    });

    /**
     * Lista avaliações de um profissional
     */
    static getByProfessional = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const { professionalId } = req.params;

        if (!professionalId) {
            throw badRequest('ID do profissional é obrigatório');
        }

        const reviews = await reviewService.getProfessionalReviews(professionalId);

        res.json({
            success: true,
            data: reviews
        });
    });
}
