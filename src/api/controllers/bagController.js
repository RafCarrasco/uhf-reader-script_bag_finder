import { 
  listBags, 
  getBag, 
  listReadingsByBag, 
  listTravelerBagHistory 
} from '../../db/bagRepository.js';

import { saveBagReading, listReadingsByBagId } from '../../db/readingRepository.js';
import { pool } from "../../db/db.js";
import { v4 as uuidv4 } from "uuid";

export const BagsController = {
  async list(req, res) {
    try {
      const bags = await listBags();
      res.json(bags);
    } catch (e) {
      console.error('[bags:list] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },

  async get(req, res) {
    try {
      const bag = await getBag(req.params.id);
      if (!bag) return res.status(404).json({ error: 'not_found' });
      res.json(bag);
    } catch (e) {
      console.error('[bags:get] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },

  async readings(req, res) {
    try {
      const rows = await listReadingsByBag(req.params.id);
      res.json(rows);
    } catch (e) {
      console.error('[bags:readings] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },

  async historyByTraveler(req, res) {
    try {
      const { travelerId } = req.params;
      const rows = await listTravelerBagHistory(travelerId);
      res.json(rows);
    } catch (e) {
      console.error('[bags:historyByTraveler] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },




  async registerReading(req, res) {
    try {
      const { epc, timestamp, location } = req.body;

      if (!epc) {
        return res.status(400).json({ error: "EPC ausente na requisição" });
      }

      // Salvando a leitura
      const result = await saveBagReading(epc, timestamp, location);
      console.log(`[bags:registerReading] EPC ${epc} registrado com sucesso`);

      // Processando o EPC para adicionar o status de embarque/desembarque na tabela bag_status_events
      const baseEPC = epc.substring(0, 27);

      // Buscando o destino da mala
      const [lastEvent] = await pool.query(
        "SELECT destination FROM bag_status_events WHERE rfid_tag = ? ORDER BY created_at DESC LIMIT 1",
        [epc]
      );

      const currentDestination = lastEvent.length > 0 ? lastEvent[0].destination : "Lisboa"; // Começa com Lisboa

      // Alterna entre embarque e desembarque
      const status = currentDestination === location ? "embarque" : "desembarque";
      const destination = status === "embarque" ? location : "Brasil"; // Próximo destino

      // Insere o evento de status na bag_status_events
      const eventId = uuidv4();
      await pool.query(
        "INSERT INTO bag_status_events (id, bag_id, status, created_at, destination, rfid_tag) VALUES (?, ?, ?, ?, ?, ?)",
        [eventId, epc, status, timestamp || new Date(), destination, epc]
      );

      console.log(`[DB] Evento registrado → EPC ${epc} → status: ${status} → destino: ${destination}`);

      res.json({ success: true, result });
    } catch (e) {
      console.error('[bags:registerReading] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },



async timeline(req, res) {
  try {
    const { id } = req.params;
    const readings = await listReadingsByBagId(id);

    if (!readings || readings.length === 0) {
      return res.status(404).json({ error: "Nenhuma leitura encontrada para esta mala" });
    }

    const timeline = readings.map(r => ({
      time: r.read_time,
      message: `Sua mala passou por ${r.location}`,
      epc: r.epc
    }));

    res.json(timeline);
  } catch (e) {
    console.error("[bags:timeline] error", e);
    res.status(500).json({ error: "internal_error" });
  }
}

};
