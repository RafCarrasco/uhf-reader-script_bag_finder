import { pool } from "./db.js";

/**
 * Busca o último evento de status para uma mala.
 * @param {string} bagId - ID da mala.
 * @returns {object} O último evento, ou null.
 */
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
        ORDER BY bse.created_at DESC
        LIMIT 1
        `,
        [bagId]
    );
    return rows[0] || null;
}

export async function markBagCollected(bagId, travelerId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `INSERT INTO bag_status_events (id, bag_id, status, destination, rfid_tag, created_at, is_final_destination)
             VALUES (?, ?, ?, ?, ?, NOW(), 1)`,
            [uuidv4(), bagId, 'COLLECTED', 'Destino Final', 'N/A']
        );

        await conn.query(`UPDATE bags SET status = 'COLLECTED', updated_at = NOW() WHERE id = ?`, [bagId]);

        await conn.query(`UPDATE trips t JOIN bags b ON t.id = b.trip_id SET t.is_done = 1 WHERE b.id = ?`, [bagId]);

        await conn.commit();
        return { success: true, message: 'Mala marcada como coletada e viagem arquivada.' };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}