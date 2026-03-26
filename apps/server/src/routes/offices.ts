import { Router } from 'express';
import {
  createOffice,
  generateInvite,
  joinOffice,
  getMyOffice,
  updateMemberRole,
  addMemberByEmail,
  quickAddUser,
} from '../controllers/officeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createOffice);
router.get('/me', getMyOffice);
router.post('/join', joinOffice);
router.post('/:id/invite', generateInvite);
router.post('/:id/add-member', addMemberByEmail);
router.post('/:id/quick-add', quickAddUser);
router.patch('/:id/members/:memberId/role', updateMemberRole);

export default router;
