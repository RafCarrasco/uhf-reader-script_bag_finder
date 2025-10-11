// db/tripDAO.js (VERSÃO FINAL SEM responsibleCollaboratorId)

import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Cria a Viagem, o Usuário (se novo) e todas as Malas/Eventos de Status em uma transação.
 */
export async function initTrip(tripTransactionData) {
    const { 
        cpf, tripId, bags, 
        // 💡 CORREÇÃO: Desestruturar usando as chaves padronizadas (origin, destination, connection)
        origin, destination, connection, 
    } = tripTransactionData;
    
    // Trata a conexão como NULL se a string estiver vazia (Flutter envia null, mas se viesse string vazia)
    const tripConnection = (connection && connection.length > 0) ? connection : null;
    
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Encontrar ou Criar Usuário (Placeholder)
        let [userRows] = await conn.query('SELECT id, full_name FROM users WHERE cpf = ? LIMIT 1', [cpf]);
        let userId;
        let isNewUser = false;

        if (userRows.length === 0) {
            // Cria um registro PLACEHOLDER
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

        // 2. Criar Viagem (Trips) - Incluindo 'origin', 'connection' e 'destination'
        await conn.query(
            `INSERT INTO trips (id, user_id, cpf, origin, destination, connection, is_done, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
            // Usa origin e destination (que o Controller garantiu não serem vazios)
            [tripId, userId, cpf, origin, destination, tripConnection] 
        );

// db/tripDAO.js (Trecho de inserção de Malas e Eventos)

// db/tripDAO.js (Trecho de inserção de Malas e Eventos)

// 3. Criar Malas (Bags) e Registros de Eventos
for (const bag of bags) {
    
    // 3a. INSERIR NA TABELA 'bags' (Status ATUAL da Mala)
    // O status inicial DEVE ser CHECKED_IN.
    await conn.query(
        `INSERT INTO bags (id, trip_id, status, epc, printed_code, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        // 💡 Usando 'CHECKED_IN'
        [bag.id, tripId, 'CHECKED_IN', bag.epc, bag.printedCode] 
    );

    // 3b. CRIAR O PRIMEIRO EVENTO (Timeline)
    // Este evento marca o ponto inicial de controle (Destino do evento é a Origem).
    await conn.query(
        `INSERT INTO bag_status_events (id, bag_id, status, destination, rfid_tag, printed_code, created_at, is_final_destination)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
        // 💡 Usando 'CHECKED_IN'
        [uuidv4(), bag.id, 'CHECKED_IN', origin, bag.epc, bag.printedCode] 
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
        // Lança um erro para que o Controller pegue e retorne 500
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