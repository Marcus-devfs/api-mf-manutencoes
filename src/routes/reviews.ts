import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import {
    authenticateToken,
    handleValidationErrors
} from '../middlewares';

const router = Router();

// Aplicar autenticação em todas as rotas de avaliação
router.use(authenticateToken);

// POST / - Criar uma nova avaliação
router.post('/',
    ReviewController.createReviewValidation,
    handleValidationErrors,
    ReviewController.create
);

// GET /professional/:professionalId - Listar avaliações
router.get('/professional/:professionalId',
    ReviewController.getByProfessional
);

export default router;
