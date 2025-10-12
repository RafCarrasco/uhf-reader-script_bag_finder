import express from 'express';
import { pool } from '../../db/db.js';
import { getUserByCpfAndEmail, updatePassword, HttpError } from '../../db/userDAO.js'; 

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('[Auth] Tentando login para:', email);

    const [rows] = await pool.query(
      `SELECT 
        id, company_id, full_name, cpf, email, role, is_active 
      FROM users 
      WHERE email = ? AND password = ? AND is_active = 1`,
      [email, password]
    );

    console.log('[Auth] Resultado da query:', rows);

    if (rows.length > 0) {
      const user = rows[0];

      res.json({
        id: user.id,
        company_id: user.company_id,
        full_name: user.full_name,
        cpf: user.cpf,
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

router.post('/reset-password', async (req, res) => {
  const { email, cpf, newPassword } = req.body;

  if (!email || !cpf || !newPassword) {
    return res.status(400).json({ error: 'Campos obrigatórios (email, cpf, newPassword) ausentes.' });
  }

  try {
    const user = await getUserByCpfAndEmail(cpf, email);

    if (!user) {
      console.warn(`[Auth] Tentativa de reset falhou para CPF: ${cpf}`);
      throw new HttpError(404, 'CPF ou e-mail inválido para a redefinição.'); 
    }

    if (user.role !== 'TRAVELER') {
      console.warn(`[Auth] Bloqueio de reset: Usuário ${user.email} não é TRAVELER (${user.role})`);
      throw new HttpError(403, 'Apenas usuários do tipo TRAVELER podem redefinir a senha.'); 
    }
    
    if (user.is_active !== 1) {
       throw new HttpError(403, 'Conta inativa. Contate o suporte.');
    }


    const updated = await updatePassword(user.id, newPassword);

    if (updated) {
      console.log(`[Auth] Senha redefinida com sucesso para o usuário: ${user.email}`);
      return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } else {
      throw new HttpError(500, 'Falha interna ao atualizar a senha.');
    }

  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.message || 'Erro interno no servidor.';
    console.error('[Auth] Erro no reset de senha:', err);
    res.status(status).json({ error: message });
  }
});

export default router;