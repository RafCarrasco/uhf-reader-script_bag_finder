import { pool } from './db.js';

export async function listBags(limit = 100) {
  const [rows] = await pool.query(
    `SELECT b.id,
            b.description,
            b.created_at,
            t.id         AS trip_id,
            u.full_name  AS traveler_name
       FROM bags b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = t.user_id
     ORDER BY b.created_at DESC
     LIMIT ?`, [limit]
  );
  return rows;
}

export async function getBag(bagId) {
  const [rows] = await pool.query(
    `SELECT b.*,
            t.origin, t.destination, t.created_at AS trip_created_at,
            u.full_name AS traveler_name, u.email AS traveler_email
       FROM bags b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = t.user_id
      WHERE b.id = ?`, [bagId]
  );
  return rows[0] || null;
}

export async function listReadingsByBag(bagId, limit = 100) {
  const [rows] = await pool.query(
    `SELECT r.id,
            rt.code        AS epc_code,
            r.read_time    AS reading_at,
            r.location,
            r.reader_ip
       FROM bag_tags bt
       JOIN rfid_tags   rt ON rt.id = bt.rfid_id
       JOIN bag_readings r ON r.rfid_id = rt.id
      WHERE bt.bag_id = ?
     ORDER BY r.read_time DESC
     LIMIT ?`, [bagId, limit]
  );
  return rows;
}
