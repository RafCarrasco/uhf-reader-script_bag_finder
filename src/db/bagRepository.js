import { pool } from './db.js';

export async function listBags(limit = 100) {
  const [rows] = await pool.query(
    `SELECT b.id,
            b.destination,
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
          rt.epc        AS epc_code,
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

export async function getBagsStatusByUserId(userId) {
  const [rows] = await pool.query(
    `
    SELECT 
      bs.id,
      bs.bag_id,
      bs.status,
      bs.created_at,
      bs.destination,
      bs.rfid_tag,
      bs.printed_code,
      bs.flight_connection,
      bs.is_final_destination
    FROM bag_status_events bs
    INNER JOIN bags b ON b.id = bs.bag_id
    INNER JOIN trips t ON t.id = b.trip_id
    INNER JOIN users u ON u.id = t.user_id
    WHERE u.id = ?
    ORDER BY bs.created_at DESC;
    `,
    [userId]
  );

  return rows;
}

export async function listTravelerBagHistory(travelerId) {
  const [rows] = await pool.query(
    `SELECT 
        t.id AS trip_id,
        t.origin,
        t.destination,
        b.id AS bag_id,
        b.description,
        e.status AS last_status,
        e.created_at AS status_time
     FROM trips t
     JOIN bags b ON b.trip_id = t.id
     JOIN bag_status_events e ON e.bag_id = b.id
     WHERE t.user_id = ?
       AND e.created_at = (
         SELECT MAX(created_at) FROM bag_status_events WHERE bag_id = b.id
       )
     ORDER BY t.created_at DESC, e.created_at DESC`,
    [travelerId]
  );
  return rows;
}

export async function saveBagReading(epc, timestamp, location) {
  try {
    const [result] = await pool.query(
      `INSERT INTO bag_readings (epc_code, read_time, location)
       VALUES (?, ?, ?)`,
      [epc, timestamp, location || null]
    );

    return { id: result.insertId, epc, timestamp, location };
  } catch (err) {
    console.error('[saveBagReading] Erro ao salvar leitura:', err);
    throw err;
  }
}

export async function listStatusEventsByBag(bagId) {
    const [rows] = await pool.query(
        `SELECT 
            bse.id, 
            bse.status, 
            bse.destination, 
            bse.created_at as event_time, 
            bse.is_final_destination,
            rt.code as epc_code
         FROM bag_status_events bse
         JOIN rfid_tags rt ON rt.id = bse.rfid_tag_id
         WHERE bse.bag_id = ? 
         ORDER BY event_time ASC`,
        [bagId]
    );
    return rows;
}
export async function getBagsByTripId(tripId) {
  const [rows] = await pool.query(
    `SELECT 
        b.id,
        b.trip_id,
        b.status,
        b.created_at,
        b.updated_at,
        b.printed_code,
        b.epc,
        t.origin,
        t.destination,
        u.full_name AS traveler_name
     FROM bags b
     JOIN trips t ON t.id = b.trip_id
     JOIN users u ON u.id = t.user_id
     WHERE b.status = 'COLLECTED' 
       AND b.trip_id = ?
     ORDER BY b.created_at DESC`,
    [tripId]
  );
  return rows;
}


export async function findByEpc(epc) {
  const [rows] = await pool.query(
    `
    SELECT 
      b.id,
      b.epc,
      b.status,
      b.created_at,
      t.id AS trip_id,
      u.full_name AS traveler_name
    FROM bags b
    LEFT JOIN trips t ON t.id = b.trip_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE b.epc = ?
    LIMIT 1
    `,
   [epc]
  );

  if (rows.length === 0) return null;
  return rows[0];
}

export async function updateBag(bagId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Atualiza bag
    const [updateBagResult] = await connection.query(
      `
      UPDATE bags
         SET epc = NULL,
             status = 'COLLECTED'
       WHERE id = ?
      `,
      [bagId.id]
    );

    if (updateBagResult.affectedRows === 0)
      throw new Error('Bag não encontrada.');

    // Busca o trip_id da bag
    const [bagRows] = await connection.query(
      'SELECT trip_id FROM bags WHERE id = ?',
      [bagId.id]
    );
    if (!bagRows.length) throw new Error('Trip não encontrada.');

    const tripId = bagRows[0].trip_id;
    // Atualiza tripcon
    await connection.query(
      'UPDATE trips SET is_done = 1 WHERE id = ?',
      [tripId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('[updateBag] Erro ao atualizar bag/trip:', error);
    return false;
  } finally {
    connection.release();
  }
}



export async function deleteBagStatusByBagId(bagId) {
  const [result] = await pool.query(
    `
    DELETE FROM bag_status_events
     WHERE bag_id = ?
    `,
    [bagId]
  );

  return result.affectedRows > 0;
}

