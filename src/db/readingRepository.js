import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tags] = await conn.query("SELECT * FROM rfid_tags WHERE code = ? LIMIT 1", [epc]);

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

    const [bag] = await conn.query(
      "SELECT b.* FROM bags b INNER JOIN bag_tags bt ON b.id = bt.bag_id WHERE bt.rfid_id = ? LIMIT 1",
      [rfidId]
    );


    let bagId;
    if (bag.length === 0) {
      bagId = uuidv4();
      await conn.query(
        `INSERT INTO bags (id, traveler_id, status, created_at)
         VALUES (?, NULL, 'CHECKED_IN', NOW())`,
        [bagId]
      );
      await conn.query("INSERT IGNORE INTO bag_tags (bag_id, rfid_id) VALUES (?, ?)", [bagId, rfidId]);
    } else {
      bagId = bag[0].id;
    }

    const readingId = uuidv4();
    await conn.query(
      `INSERT INTO bag_readings (id, rfid_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, rfidId, location || "Desconhecida"]
    );

    await conn.query(
      `UPDATE bags SET status = 'IN_TRANSIT', updated_at = NOW() WHERE id = ?`,
      [bagId]
    );

    await conn.commit();

    console.log(`[DB] Leitura registrada para EPC ${epc} → bag ${bagId}`);
    return { id: readingId, epc, rfid_id: rfidId, bag_id: bagId, location };
  } catch (err) {
    await conn.rollback();
    console.error("[DB ERROR] Falha ao salvar leitura:", err);
    throw err;
  } finally {
    conn.release();
  }
}

export async function listReadingsByBagId(bagId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT br.id, br.location, br.read_time, rt.code AS epc
      FROM bag_readings br
      INNER JOIN rfid_tags rt ON br.rfid_id = rt.id
      WHERE rt.bag_id = ?
      ORDER BY br.read_time ASC
      `,
      [bagId]
    );
    return rows;
  } finally {
    conn.release();
  }
}
