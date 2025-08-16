import { Router } from 'express';
import { BagsController } from '../controllers/bagController.js';

const r = Router();

r.get('/', BagsController.list);
r.get('/:id', BagsController.get);
r.get('/:id/readings', BagsController.readings);

export default r;
