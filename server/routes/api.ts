import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { getSubscriptions, unsubscribe } from '../controllers/emailController';

const router = Router();

router.use(isAuthenticated);

router.get('/subscriptions', getSubscriptions);
router.post('/unsubscribe', unsubscribe);

export default router;