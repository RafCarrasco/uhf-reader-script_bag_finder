// src/api/controllers/userController.js
import { pool } from '../../db/db.js';
import { getUserByCpf, upsertUser } from '../../db/userDAO.js'; // ⬅️ IMPORTA os dois

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT id, email, full_name, phone, role, cpf, is_active, created_at, updated_at
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const u = rows[0];
    return res.json({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      phone: u.phone || '',
      role: u.role,
      cpf: u.cpf || '',
      isActive: u.is_active === 1,
      createdAt: u.created_at,
      updatedAt: u.updated_at ?? null,
    });
  } catch (error) {
    console.error('[getUserById]', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
}

export async function getUserByCpfController(req, res) {
  const { cpf } = req.params;
  if (!cpf || cpf.length < 11) return res.status(400).json({ error: 'CPF inválido ou ausente.' });

  try {
    const user = await getUserByCpf(cpf); // já não traz password
    if (!user) return res.status(404).json({ error: 'CPF não cadastrado.' });
    return res.json(user);
  } catch (err) {
    console.error('[getUserByCpf]', err);
    return res.status(500).json({ error: 'Erro interno ao verificar CPF.' });
  }
}

export async function addUserController(req, res) {
  try {
    const b = req.body ?? {};

    const data = {
      cpf: String(b.cpf || '').replace(/\D/g, ''),           // remove . e -
      fullName: String(b.fullName || '').trim(),
      email: String(b.email || '').trim().toLowerCase(),
      password: String(b.password || ''),
      role: b.role || 'TRAVELER',                            // <- default
      phone: b.phone ? String(b.phone).trim() : null,
      isActive: b.isActive ?? true,
      company_id: b.company_id ?? null,
    };

    const missing = [];
    if (!data.fullName) missing.push('fullName');
    if (!data.email)    missing.push('email');
    if (!data.password) missing.push('password');
    if (!data.cpf)      missing.push('cpf');

    if (missing.length) {
      return res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
    }
    if (data.cpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido. Envie 11 dígitos.' });
    }

    const result = await upsertUser(data);
    return res.status(result.created ? 201 : 200).json(result.user);

  } catch (err) {
    const status =
      err.statusCode ?? (err.code === 'ER_DUP_ENTRY' ? 409 : 500);
    const message =
      err.message ?? (status === 409 ? 'E-mail ou CPF já cadastrado' : 'Erro interno no servidor.');
    console.error('[addUserController]', { status, ...err });
    return res.status(status).json({ error: message });
  }
}

