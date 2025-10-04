import express from 'express';
import cors from 'cors';
import { pingDB } from '../db/db.js';
import bagRoutes from './routes/bagRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import rfidTagRoutes from "./routes/rfidTagRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const ok = await pingDB();
    res.json({ api: 'up', db: ok ? 'up' : 'down' });
  } catch (e) {
    res.status(500).json({ api: 'up', db: 'down', error: String(e) });
  }
});

app.use('/bags', bagRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use("/rfid_tags", rfidTagRoutes);
app.use("/bags/readings", readingRoutes);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

export default app;
