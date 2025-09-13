import express from 'express';
import { pool } from '../../db/db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('[Auth] Tentando login para:', email);

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND password = ? AND is_active = 1',
      [email, password]
    );

    console.log('[Auth] Resultado da query:', rows);

    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        id: user.id,
        company_id: user.company_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active === 1,
      });
    } else {
      console.warn('[Auth] Credenciais inválidas para', email);
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error('[Auth] Erro no login:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
