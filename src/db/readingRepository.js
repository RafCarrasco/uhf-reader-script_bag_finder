import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

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

    if (bag.length === 0) {
      console.warn(`[DB] Tag ${epc} sem vínculo com bag — leitura ignorada.`);
      await conn.rollback();
      return null;
    }

    const bagId = bag[0].id;

    const [activeTrip] = await conn.query(
      `SELECT t.id FROM trips t
       JOIN users u ON u.id = t.user_id
       WHERE u.role = 'TRAVELER' AND (t.is_done = 0 OR t.is_done IS NULL)
       ORDER BY t.created_at DESC
       LIMIT 1`
    );

    if (activeTrip.length > 0) {
      const tripId = activeTrip[0].id;
      await conn.query(
        "UPDATE bags SET trip_id = ?, updated_at = NOW() WHERE id = ?",
        [tripId, bagId]
      );
    }

    // 4️⃣ Registra leitura
    const readingId = uuidv4();
    const finalLocation = location || "Reader-01";
    await conn.query(
      "INSERT INTO bag_readings (id, rfid_id, location, read_time) VALUES (?, ?, ?, NOW())",
      [readingId, rfidId, finalLocation]
    );

    // 5️⃣ Atualiza status da bag
    await conn.query(
      "UPDATE bags SET status = 'IN_TRANSIT', updated_at = NOW() WHERE id = ?",
      [bagId]
    );

    await conn.commit();

    console.log(`[DB] Leitura registrada → EPC ${epc} → bag ${bagId}`);
    return { id: readingId, epc, bag_id: bagId, rfid_id: rfidId, location: finalLocation };
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
  SELECT br.id, br.location, br.read_time, rt.epc AS epc
  FROM bag_readings br
  INNER JOIN rfid_tags rt ON br.rfid_id = rt.id
  INNER JOIN bag_tags bt ON bt.rfid_id = rt.id
  WHERE bt.bag_id = ?
  ORDER BY br.read_time ASC
  `,
      [bagId]
    );

    return rows;
  } finally {
    conn.release();
  }
}
