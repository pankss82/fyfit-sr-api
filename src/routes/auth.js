import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

export default router;
