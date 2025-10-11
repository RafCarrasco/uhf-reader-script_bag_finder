// src/db/userDAO.js  (ESM, exports nomeados)
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.statusCode = status;
  }
}

export async function getUserByCpf(cpf, cx = pool) {
  const [rows] = await cx.execute(
    `SELECT id, company_id, full_name, cpf, email, phone, role, is_active, created_at, updated_at
       FROM users
      WHERE cpf = ?
      LIMIT 1`,
    [cpf]
  );
  return rows[0] ?? null;
}

export async function upsertUser(userData) {
  const {
    fullName, email, password, role, cpf,
    phone, isActive, company_id, companyId, id: maybeId,
  } = userData;

  const userPhone = phone ?? null;
  const userCompanyId = company_id ?? companyId ?? null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const existing = await getUserByCpf(cpf, conn);

    if (existing) {
      // Evita e-mail já usado por OUTRO usuário
      const [clash] = await conn.execute(
        `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
        [email, existing.id]
      );
      if (clash.length) throw new HttpError(409, 'E-mail já cadastrado em outra conta');

      await conn.execute(
        `UPDATE users
            SET full_name = ?, email = ?, password = ?, role = ?, phone = ?, is_active = ?, company_id = ?
          WHERE id = ?`,
        [fullName, email, password, role, userPhone, isActive ? 1 : 0, userCompanyId, existing.id]
      );

      await conn.commit();
      return { created: false, user: { ...userData, id: existing.id } };
    }

    // Novo usuário — checa duplicidade
    const [dups] = await conn.execute(
      `SELECT id FROM users WHERE email = ? OR cpf = ? LIMIT 1`,
      [email, cpf]
    );
    if (dups.length) throw new HttpError(409, 'E-mail ou CPF já cadastrado');

    const newId = maybeId || uuidv4();
    await conn.execute(
      `INSERT INTO users
         (id, full_name, email, password, role, is_active, created_at, cpf, phone, company_id)
       VALUES
         (?,  ?,         ?,     ?,        ?,    ?,         NOW(),     ?,   ?,     ?)`,
      [newId, fullName, email, password, role, isActive ? 1 : 0, cpf, userPhone, userCompanyId]
    );

    await conn.commit();
    return { created: true, user: { ...userData, id: newId } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
