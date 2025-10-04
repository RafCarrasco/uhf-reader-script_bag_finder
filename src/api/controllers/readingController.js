import { saveBagReading } from '../../db/readingRepository.js';

export const ReadingController = {
  async create(req, res) {
    try {
      const { epc, location, reader_ip } = req.body;

      if (!epc) {
        return res.status(400).json({ error: "EPC obrigatório" });
      }

      const reading = await saveReading({ epc, location, reader_ip });
      res.json(reading);
    } catch (e) {
      console.error("[readings:create] error", e);
      res.status(500).json({ error: "internal_error" });
    }
  }
};
