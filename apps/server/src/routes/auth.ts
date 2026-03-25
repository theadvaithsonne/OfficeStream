import { Router } from 'express';
import { register, login, refresh, logout, me, updateStatus } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/me/status', requireAuth, updateStatus);

export default router;
