import { pool } from '../../db/db.js';

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone || '',
      role: user.role,
      cpf: user.cpf || '',
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
}
