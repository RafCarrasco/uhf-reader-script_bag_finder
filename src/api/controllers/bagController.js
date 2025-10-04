import { 
  listBags, 
  getBag, 
  listReadingsByBag, 
  listTravelerBagHistory 
} from '../../db/bagRepository.js';

import { saveBagReading } from '../../db/readingRepository.js'; // ✅ IMPORT NECESSÁRIA

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

      const result = await saveBagReading(epc, timestamp, location);
      console.log(`[bags:registerReading] EPC ${epc} registrado com sucesso`);
      res.json({ success: true, result });
    } catch (e) {
      console.error('[bags:registerReading] error', e);
      res.status(500).json({ error: 'internal_error' });
    }
  },
};
