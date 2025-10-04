import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

export async function saveReading({ epc, location, reader_ip }) {
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
    } else {
      rfidId = tags[0].id;
    }

    const readingId = uuidv4();
    await conn.query(
      `INSERT INTO bag_readings (id, rfid_id, location, reader_ip, read_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [readingId, rfidId, location || null, reader_ip || null]
    );

    await conn.commit();

    return { id: readingId, epc, rfid_id: rfidId, location, reader_ip };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
