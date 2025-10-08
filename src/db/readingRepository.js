import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

const locais = [
  "São Paulo",
  "Miami",
  "Nova York",
  "Paris",
  "Dubai",
  "Tóquio",
  "Pequim",
  "Londres",
  "Berlim",
  "Los Angeles",
  "Toronto",
  "Madri",
  "Cairo",
  "Johannesburgo",
  "Sydney"
];

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();


    const [tags] = await conn.query(
      "SELECT * FROM rfid_tags WHERE epc = ? LIMIT 1",
      [epc]
    );


    if (tags.length === 0) {
      console.warn(`[DB] Tag ${epc} não cadastrada no sistema — ignorando leitura.`);
      await conn.rollback();
      return null;
    }

    const rfidId = tags[0].id;

    const [bag] = await conn.query(
      "SELECT b.* FROM bags b INNER JOIN bag_tags bt ON b.id = bt.bag_id WHERE bt.rfid_id = ? LIMIT 1",
      [rfidId]
    );


    let bagId;
    if (bag.length === 0) {
      bagId = uuidv4();
      await conn.query(
        `INSERT INTO bags (id, created_at, updated_at)
     VALUES (?, NOW(), NOW())`,
        [bagId]
      );

      await conn.query(
        "INSERT IGNORE INTO bag_tags (bag_id, rfid_id) VALUES (?, ?)",
        [bagId, rfidId]
      );
    } else {
      bagId = bag[0].id;
    }


    const readingId = uuidv4();
    const finalLocation = location || "Reader-01";
    await conn.query(
      `INSERT INTO bag_readings (id, rfid_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, rfidId, location || "Desconhecida"]
    );

    // 5️⃣ Atualiza status da bag
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
