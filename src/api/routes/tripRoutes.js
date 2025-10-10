import express from "express";
import { getTripsByStatus, createInitialTrip } from "../controllers/tripController.js";

const router = express.Router();

router.get("/status/:isDone/:travelerId", getTripsByStatus);
router.post("/init", createInitialTrip);

export default router;
