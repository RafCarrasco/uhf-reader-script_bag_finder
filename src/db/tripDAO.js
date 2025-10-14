
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

export async function initTrip(tripTransactionData) {
    const { 
        cpf, tripId, bags, 
        origin, destination, connection, 
    } = tripTransactionData;
    
    const tripConnection = (connection && connection.length > 0) ? connection : null;
    
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        let [userRows] = await conn.query('SELECT id, full_name FROM users WHERE cpf = ? LIMIT 1', [cpf]);
        let userId;
        let isNewUser = false;

        if (userRows.length === 0) {
            userId = uuidv4();
            isNewUser = true;
            await conn.query(
                `INSERT INTO users (id, full_name, cpf, email, role, is_active, password) 
                 VALUES (?, ?, ?, ?, 'TRAVELER', 1, ?)`,
                [userId, `Passageiro ${cpf}`, cpf, `temp-${userId}@temp.com`, uuidv4()] 
            );
        } else {
            userId = userRows[0].id;
        }

        await conn.query(
            `INSERT INTO trips (id, user_id, cpf, origin, destination, connection, is_done, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
            [tripId, userId, cpf, origin, destination, tripConnection] 
        );

for (const bag of bags) {
    await conn.query(
        `INSERT INTO bags (id, trip_id, status, epc, printed_code, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [bag.id, tripId, 'CHECKED_IN', bag.epc, bag.printedCode] 
    );

    await conn.query(
        `INSERT INTO bag_status_events (id, bag_id, status, destination, rfid_tag, printed_code, created_at, is_final_destination,flight_connection)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 0,?)`,
        [uuidv4(), bag.id, 'CHECKED_IN', origin, bag.epc, bag.printedCode, tripConnection] 
    );
}

        await conn.commit();
        
        return { 
            success: true, 
            tripId, 
            userId, 
            message: isNewUser ? "Viagem criada e novo passageiro registrado." : "Viagem criada."
        };

    } catch (err) {
        await conn.rollback();
        console.error('[DB ERROR] Falha ao gerar viagem transacionalmente:', err);
        throw new Error('Falha transacional ao criar viagem e vincular bagagens.');
    } finally {
        conn.release();
    }
}


export async function getBagItineraryAndLastEvent(bagId) {
    const [rows] = await pool.query(
        `SELECT 
            t.origin, t.connection, t.destination,
            b.id AS bag_id,
            bse.status AS last_status, 
            bse.destination AS last_location
         FROM bags b
         JOIN trips t ON t.id = b.trip_id
         LEFT JOIN bag_status_events bse ON bse.bag_id = b.id
         ORDER BY bse.created_at DESC
         LIMIT 1`,
        [bagId]
    );
    return rows[0] || null;
}

export async function listTravelerTripHistory(travelerId) {
  const [rows] = await pool.query(
    `
    SELECT 
        t.id,
        t.origin,
        t.destination,
        t.connection,
        t.is_done,
        t.created_at,
        t.cpf,
        t.user_id,
        t.responsible_collaborator_id
    FROM trips t
    INNER JOIN users u
        ON u.cpf = t.cpf
    WHERE u.id = ?
      AND u.role = 'TRAVELER'
      AND t.is_done = 1
    ORDER BY t.created_at DESC;
    `,
    [travelerId]
  );
  return rows;
}