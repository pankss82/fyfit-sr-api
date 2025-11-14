import { Router } from 'express';
import { authenticate, submitRingData, getRingData, submitRingDataBatch } from '../controllers/ringDataController.js';

const router = Router();

// POST /ring/data — submit from ring
router.post('/ring/data', authenticate, submitRingData);

// GET /ring/data — fetch user data
router.get('/ring/data', authenticate, getRingData);

router.post('/ring/data/batch', authenticate, submitRingDataBatch);

export default router;
