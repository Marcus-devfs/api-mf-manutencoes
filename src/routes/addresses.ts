import { Router } from 'express';
import { AddressController } from '../controllers/addressController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Todas as rotas de endereço requerem autenticação
router.use(authenticateToken);

router.get('/', AddressController.list);
router.post('/', AddressController.create);
router.put('/:id', AddressController.update);
router.delete('/:id', AddressController.delete);
router.patch('/:id/default', AddressController.setDefault);

export default router;
