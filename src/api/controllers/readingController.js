import { processEPC } from "../../api/epc/processEPC.js";

export const ReadingController = {
  
  async create(req, res) {
    console.log("ReadingController.create chamado com EPC:", epc);
    try {
      const { epc } = req.body;

      if (!epc) {
        return res.status(400).json({ error: "EPC é obrigatório" });
      }

      console.log(`Recebendo EPC: ${epc}`);

      await processEPC(epc);

      res.status(200).send('Tag processada com sucesso!');
    } catch (e) {
      console.error("[reading:create] error", e);
      res.status(500).json({ error: "internal_error" });
    }
  }
};
