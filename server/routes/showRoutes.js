import express from "express";
import { getNowPlayingMovies, addShow, getShows, getShow } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

showRouter.get('/now-playing',protectAdmin, getNowPlayingMovies);
showRouter.post('/add',protectAdmin,addShow)
showRouter.get("/all",getShows)
showRouter.get("/:movieID",getShow)

export default showRouter;