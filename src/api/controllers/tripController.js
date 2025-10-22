import { pool } from "../../db/db.js";
import { initTrip } from '../../db/tripDAO.js';
import { listTravelerTripHistory } from '../../db/tripDAO.js';
import { getTripsByFullName } from '../../db/tripDAO.js';
import { listTravelerTripHistoryByLocation } from "../../db/tripDAO.js";


export async function getTripsByStatus(req, res) {
    const { isDone, travelerId } = req.params;

    try {
        const [rows] = await pool.query(
            `
            SELECT 
                t.id,
                t.origin,
                t.destination,
                t.connection, -- 💡 ADICIONADO: Campo de conexão
                t.created_at,
                b.id AS bag_id,
                b.status AS bag_status,
                rt.epc AS rfid_code,
                rt.printed_code
            FROM trips t
            LEFT JOIN bags b ON b.trip_id = t.id
            LEFT JOIN bag_tags bt ON bt.bag_id = b.id
            LEFT JOIN rfid_tags rt ON rt.id = bt.rfid_id
            WHERE t.user_id = ? AND t.is_done = ?
            ORDER BY t.created_at DESC
            `,
            [travelerId, isDone]
        );

        res.json(rows);
    } catch (err) {
        console.error("[Trips:getTripsByStatus] Erro:", err);
        res.status(500).json({ error: "Erro ao consultar viagens" });
    }
}

export async function createInitialTrip(req, res) {
    const tripTransactionData = req.body; 
    
    const { collaboratorId, cpf, origin, destination, bags } = tripTransactionData;
    
    if (!collaboratorId) {
        return res.status(400).json({ error: "ID do colaborador responsável é obrigatório." });
    }
    
    if (
        !cpf || cpf.length === 0 || 
        !origin || origin.length === 0 ||
        !destination || destination.length === 0 ||
        !bags || bags.length === 0
    ) {
        return res.status(400).json({ error: "Dados obrigatórios (CPF, Origem, Destino, Malas) não fornecidos." });
    }

    try {
        const result = await initTrip(tripTransactionData); 
        
        res.status(201).json(result); 

    } catch (err) {
        console.error("[Trips:createInitialTrip] Erro Transacional:", err);
        res.status(500).json({ error: "Falha ao iniciar viagem.", details: err.message });
    }
}

export async function historyByTraveler(req, res) {
    try {
        const { travelerId } = req.params;
        const rows = await listTravelerTripHistory(travelerId); 
        res.json(rows);
    } catch (e) {
        console.error('[bags:historyByTraveler] error', e);
        res.status(500).json({ error: 'internal_error' });
    }
}

export async function getAllTrips(req, res) {
    try {
        const [rows] = await pool.query(`
            SELECT 
                t.id,
                t.origin,
                t.destination,
                t.connection, -- 💡 ADICIONADO: Campo de conexão
                t.is_done AS isDone,
                t.created_at,
                t.user_id,
                t.cpf
            FROM trips t
            ORDER BY t.created_at DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error("[Trips:getAllTrips] Erro:", err);
        res.status(500).json({ error: "Erro ao buscar todas as viagens." });
    }
}

export async function getTripsByTravelerFullName(req, res) {
  const { fullName } = req.params;

  try {
    const trips = await getTripsByFullName(fullName);
    if (!trips || trips.length === 0) {
      return res.status(404).json({
        message: "Nenhuma viagem encontrada para este passageiro.",
      });
    }

    return res.status(200).json(trips);
  } catch (error) {
    console.error("[tripController:getTripsByTravelerFullName]", error);
    return res.status(500).json({
      message: "Erro interno ao buscar viagens por nome do passageiro.",
      error: error.message,
    });
  }
}

export async function searchTravelerTripsByLocation(req, res) {
  try {
    const { userId, term } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "O ID do usuário é obrigatório." });
    }

    if (!term || term.trim().length === 0) {
      return res.status(400).json({ error: "O termo de busca é obrigatório." });
    }

    const trips = await listTravelerTripHistoryByLocation(userId, term);
    console.log(trips)
    if (!trips || trips.length === 0) {
      return res.status(404).json({
        message: "Nenhuma viagem encontrada para este usuário com o termo informado.",
      });
    }

    return res.status(200).json(trips);
  } catch (error) {
    console.error("[tripController:searchTravelerTrips] Erro ao buscar viagens:", error);
    return res.status(500).json({
      message: "Erro interno ao buscar viagens por origem/destino e usuário.",
      error: error.message,
    });
  }
}

