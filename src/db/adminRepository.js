import { pool } from "./db.js";

export async function getCollaborators() {
  const [rows] = await pool.query(
    `
    SELECT 
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.company_id,
      u.phone,
      u.is_active,
      u.created_at,
      u.cpf
    FROM users u
    WHERE u.role = 'COLLABORATOR'
    `,
  );

  return rows;
}

