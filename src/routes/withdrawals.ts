import { Router } from 'express';
import { WithdrawalController } from '../controllers/withdrawalController';
import { authenticateToken, requireProfessional } from '../middlewares';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken);
router.use(requireProfessional);

router.get(
    '/balance',
    WithdrawalController.getBalance
);

router.post(
    '/',
    WithdrawalController.validationRules,
    handleValidationErrors,
    WithdrawalController.requestWithdrawal
);

router.get(
    '/',
    WithdrawalController.getWithdrawals
);

export default router;
