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
        `INSERT INTO bags (id, created_at, updated_at) VALUES (?, NOW(), NOW())`,
        [bagId]
      );
      await conn.query("INSERT IGNORE INTO bag_tags (bag_id, rfid_id) VALUES (?, ?)", [bagId, rfidId]);
    } else {
      bagId = bag[0].id;
    }

    const [countRows] = await conn.query(
      "SELECT COUNT(*) AS total FROM bag_readings WHERE rfid_id = ?",
      [rfidId]
    );
    const leituraAtual = countRows[0].total + 1;

    const tipo = leituraAtual % 2 === 1 ? "Embarque" : "Desembarque";
    const cidade = locais[Math.floor(Math.random() * locais.length)];
    const localFinal = location || `${tipo} - ${cidade}`;

    const readingId = uuidv4();
    await conn.query(
      `INSERT INTO bag_readings (id, rfid_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, rfidId, localFinal]
    );

    await conn.query(
      `UPDATE bags SET updated_at = NOW() WHERE id = ?`,
      [bagId]
    );

    await conn.commit();

    console.log(`[DB] ${tipo} em ${cidade} → EPC ${epc}`);
    return { id: readingId, epc, tipo, cidade, bag_id: bagId };
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
