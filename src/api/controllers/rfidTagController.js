import { updatePrintedCode } from "../../db/rfidTagRepository.js";

export const RfidTagController = {
  async update(req, res) {
    try {
      const { id } = req.params;
      const { printed_code } = req.body;

      if (!printed_code) {
        return res.status(400).json({ error: "printed_code é obrigatório" });
      }

      const tag = await updatePrintedCode(id, printed_code);
      if (!tag) return res.status(404).json({ error: "tag_not_found" });

      res.json(tag);
    } catch (e) {
      console.error("[rfid:update] error", e);
      res.status(500).json({ error: "internal_error" });
    }
  }
};
