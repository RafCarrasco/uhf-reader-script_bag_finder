import express from 'express';
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@gol.com' && password === '123456') {
    res.json({
      id: 'u-1',
      company_id: 'c-1',
      full_name: 'Fulano Admin',
      email: 'admin@gol.com',
      role: 'ADMIN',
      is_active: true,
    });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

export default router;
