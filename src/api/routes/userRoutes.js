import express from 'express';
import { pool } from '../../db/db.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, company_id, full_name, email, phone, role, is_active, created_at 
       FROM users 
       WHERE id = ? 
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
