import { Router } from 'express';
import { getToken, getGuestToken } from '../controllers/tokenController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getToken);
router.post('/guest', getGuestToken); // public — no auth

export default router;
