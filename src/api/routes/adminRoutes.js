import express from "express";
import * as AdminController from "../controllers/adminController.js";

const router = express.Router();

router.get("/collaborators", AdminController.getCollaborators);

export default router;