import express from "express";
import { getTripsByStatus, createInitialTrip,historyByTraveler, getAllTrips,getTripsByTravelerFullName,searchTravelerTripsByLocation  } from "../controllers/tripController.js";

const router = express.Router();

router.get("/status/:isDone/:travelerId", getTripsByStatus);
router.post("/init", createInitialTrip);
router.get("/", getAllTrips);
router.get("/name/:fullName", getTripsByTravelerFullName);
router.get("/search/:userId/:term", searchTravelerTripsByLocation);


router.get('/:travelerId/history', historyByTraveler);

export default router;