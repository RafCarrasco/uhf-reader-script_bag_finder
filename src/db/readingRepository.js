import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tags] = await conn.query(
      "SELECT * FROM rfid_tags WHERE code = ? LIMIT 1",
      [epc]
    );

    let rfidId;
    if (tags.length === 0) {
      rfidId = uuidv4();
      await conn.query(
        "INSERT INTO rfid_tags (id, code, created_at) VALUES (?, ?, NOW())",
        [rfidId, epc]
      );
      console.log(`[DB] Nova tag registrada: ${epc}`);
    } else {
      rfidId = tags[0].id;
    }

    const readingId = uuidv4();
    await conn.query(
      `INSERT INTO bag_readings (id, rfid_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, rfidId, location || null]
    );

    await conn.commit();

    console.log(`[DB] Nova leitura salva para EPC ${epc}`);
    return { id: readingId, epc, rfid_id: rfidId, location };
  } catch (err) {
    await conn.rollback();
    console.error("[DB ERROR] Falha ao salvar leitura:", err);
    throw err;
  } finally {
    conn.release();
  }
}
