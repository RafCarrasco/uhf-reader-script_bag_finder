import express from 'express';
import { BagsController } from '../controllers/bagController.js';

const router = express.Router();

router.get('/', BagsController.list);
router.get('/:id', BagsController.get);
router.get('/:id/readings', BagsController.readings);

export default router;
