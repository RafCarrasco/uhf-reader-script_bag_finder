import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Busca o último evento de status para uma mala.
 * @param {string} bagId - ID da mala.
 * @returns {object} O último evento, ou null.
 */
export async function getBagByEPC(epc) {
    const [rows] = await pool.query(
        `SELECT 
          b.id,
          b.user_id,
          b.trip_id,
          b.epc,
          b.printed_code,
          b.brand,
          b.color,
          b.weight,
          b.status,
          b.created_at,
          b.updated_at
         FROM bags b
         WHERE b.epc = ?`,
        [epc]
    );
    return rows; 
}

export async function getLastBagStatusEvent(bagId) {
    const [rows] = await pool.query(
        `SELECT status, destination, created_at 
         FROM bag_status_events 
         WHERE bag_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [bagId]
    );
    return rows[0] || null;
}

export async function getBagItineraryAndLastEvent(bagId) {
    const [rows] = await pool.query(
        `
         SELECT 
             t.origin, t.connection, t.destination, /* Dados do Itinerário */
             bse.status AS last_status, 
             bse.destination AS last_location
         FROM bags b
         JOIN trips t ON t.id = b.trip_id
         LEFT JOIN bag_status_events bse ON bse.bag_id = b.id
         WHERE b.id = ?
         ORDER BY bse.created_at DESC
         LIMIT 1
         `,
        [bagId]
    );
    return rows[0] || null;
}

/**
 * Transação para marcar uma mala como coletada, atualizar seu status,
 * limpar o EPC (liberando a tag RFID) e finalizar a viagem.
 * @param {string} bagId - ID da mala.
 * @returns {object} 
 */
export async function markBagCollected(bagId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `INSERT INTO bag_status_events (id, bag_id, status, destination, rfid_tag, created_at, is_final_destination)
             SELECT ?, ?, 'COLLECTED', b.destination, b.rfid_tag, NOW(), 1 FROM bags b WHERE b.id = ?`,
            [uuidv4(), bagId, bagId]
        );

        await conn.query(`UPDATE bags SET status = 'COLLECTED', rfid_tag = NULL, updated_at = NOW() WHERE id = ?`, [bagId]);

        await conn.query(`UPDATE trips t JOIN bags b ON t.id = b.trip_id SET t.is_done = 1 WHERE b.id = ?`, [bagId]);

        await conn.commit();
        return { success: true, message: 'Mala marcada como coletada, EPC limpo e viagem arquivada.' };
    } catch (err) {
        await conn.rollback();
        console.error("[markBagCollected] Transaction error:", err);
        throw err;
    } finally {
        conn.release();
    }
}