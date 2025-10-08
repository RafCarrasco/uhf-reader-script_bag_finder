import express from "express";
import { ReadingController } from "../controllers/readingController.js";

const router = express.Router();

router.post("/process-tag", ReadingController.create);

export default router;
