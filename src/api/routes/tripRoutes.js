import express from "express";
import { getTripsByStatus, createInitialTrip,historyByTraveler, getAllTrips  } from "../controllers/tripController.js";

const router = express.Router();

router.get("/status/:isDone/:travelerId", getTripsByStatus);
router.post("/init", createInitialTrip);
router.get("/", getAllTrips);

router.get('/:travelerId/history', historyByTraveler);

export default router;