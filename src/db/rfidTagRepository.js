import { pool } from "./db.js";

export async function updatePrintedCode(id, printed_code) {
  const [result] = await pool.query(
    "UPDATE rfid_tags SET printed_code = ? WHERE id = ?",
    [printed_code, id]
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query("SELECT * FROM rfid_tags WHERE id = ?", [id]);
  return rows[0] || null;
}
