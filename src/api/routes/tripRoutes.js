import express from "express";
import { getTripsByStatus } from "../controllers/tripController.js";

const router = express.Router();

router.get("/status/:isDone/:travelerId", getTripsByStatus);

export default router;
