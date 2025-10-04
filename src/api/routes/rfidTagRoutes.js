import express from "express";
import { RfidTagController } from "../controllers/rfidTagController.js";

const router = express.Router();

router.patch("/:id", RfidTagController.update);

export default router;
