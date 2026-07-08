import { Router } from 'express';
import { ModerationController } from '../controllers/moderationController';
import {
  authenticateToken,
  requireVerification,
  apiLimiter,
} from '../middlewares';
import { handleValidationErrors } from '../middlewares/validation';

const router = Router();

router.use(apiLimiter);
router.use(authenticateToken);
router.use(requireVerification);

router.post(
  '/report',
  ModerationController.reportValidation,
  handleValidationErrors,
  ModerationController.reportUser
);

router.post(
  '/block',
  ModerationController.blockValidation,
  handleValidationErrors,
  ModerationController.blockUser
);

router.delete(
  '/block/:userId',
  ModerationController.unblockUser
);

router.get(
  '/blocked',
  ModerationController.getBlockedUsers
);

export default router;
