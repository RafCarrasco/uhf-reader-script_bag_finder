import express from "express";
import { ReadingController } from "../controllers/readingController.js";

const router = express.Router();

router.post("/", ReadingController.create);

export default router;
