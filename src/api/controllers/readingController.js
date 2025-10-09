// readingController.js (Localize e edite este arquivo)

import { saveBagReading } from '../../db/readingRepository.js';

// Definição do objeto Controller (Exemplo: seu código original)
const ReadingController = {
  async create(req, res) {
    try {
      const { epc, location, reader_ip } = req.body;

      if (!epc) {
        return res.status(400).json({ error: "EPC obrigatório" });
      }

      // ⚠️ Corrigi o nome da função aqui, de saveReading para saveBagReading (seu DAO)
      const reading = await saveBagReading({ epc, location, reader_ip }); 
      res.json(reading);
    } catch (e) {
      console.error("[readings:create] error", e);
      res.status(500).json({ error: "internal_error" });
    }
  }
};

// 💡 CORREÇÃO: Altere a exportação padrão (default) para exportação nomeada (named export)

export { ReadingController }; 
// OU (se você só tiver um export no arquivo)
// export const ReadingController = { ... }