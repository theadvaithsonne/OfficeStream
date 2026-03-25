import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getConversation, getUnreadCounts } from '../controllers/messageController';

const router = Router();
router.use(requireAuth);

router.get('/unread', getUnreadCounts);
router.get('/:userId', getConversation);

export default router;
