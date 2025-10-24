import express from 'express';
import { pool } from '../../db/db.js'; 
import { getUserByCpfController, addUserController, getUserById, updateUserController, upsertUserCadastroController } from '../controllers/userController.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, company_id, full_name, cpf, email, phone, role, is_active, created_at 
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

router.put('/:id', updateUserController);

router.get('/cpf/:cpf', getUserByCpfController); 

router.post('/', addUserController);

router.put('/upsert', upsertUserCadastroController);


export default router;