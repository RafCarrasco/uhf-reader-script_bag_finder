import { pool } from "../../db/db.js";
import { initTrip } from '../../db/tripDAO.js';
import { listTravelerTripHistory } from '../../db/tripDAO.js';

export async function getTripsByStatus(req, res) {
  const { isDone, travelerId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        t.id,
        t.origin,
        t.destination,
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
    
    // 💡 CORREÇÃO 1: Desestruturar os campos obrigatórios (origin e destination)
    // Usamos os nomes que o DAO espera (origin, destination).
    const { collaboratorId, cpf, origin, destination, bags } = tripTransactionData;
    
    // 💡 CORREÇÃO 2: Tratar o erro de req.user.id (TypeError)
    if (!collaboratorId) {
        return res.status(400).json({ error: "ID do colaborador responsável é obrigatório." });
    }
    
    // 💡 CORREÇÃO 3: Validação rigorosa (checar por vazio '')
    if (!cpf || cpf.length === 0 || 
        !origin || origin.length === 0 ||  // Checa Origem
        !destination || destination.length === 0 || // Checa Destino
        !bags || bags.length === 0) {
        
        return res.status(400).json({ error: "Dados obrigatórios (CPF, Origem, Destino, Malas) não fornecidos." });
    }

    try {
        // Chama o DAO transacional.
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