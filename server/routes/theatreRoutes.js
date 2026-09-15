import express from "express";
import {
  addTheatre,
  getTheatres,
  updateTheatre,
  deleteTheatre,
} from "../controllers/theatreController.js";
import { protectAdmin } from "../middleware/auth.js";

const theatreRouter = express.Router();

theatreRouter.get("/all", getTheatres);
theatreRouter.post("/add", protectAdmin, addTheatre);
theatreRouter.put("/:id", protectAdmin, updateTheatre);
theatreRouter.delete("/:id", protectAdmin, deleteTheatre);

export default theatreRouter;
