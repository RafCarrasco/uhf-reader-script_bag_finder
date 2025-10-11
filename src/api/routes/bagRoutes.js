import express from 'express';
import { BagsController } from '../controllers/bagController.js';

const router = express.Router();

router.get('/', BagsController.list);
router.get('/:id', BagsController.get);
router.get('/:id/readings', BagsController.readings);
router.get("/:id/timeline", BagsController.timeline);
router.post('/readings', BagsController.registerReading);
router.get('/trips/:tripId', BagsController.getByTripId);

export default router;
