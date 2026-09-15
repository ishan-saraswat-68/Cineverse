import express from "express";
import { getNowPlayingMovies, searchMovies, addShow, getShows, getShow,getSingleShow } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

showRouter.get('/now-playing',protectAdmin, getNowPlayingMovies);
showRouter.get('/search-movies',protectAdmin, searchMovies);
showRouter.post('/add',protectAdmin,addShow)
showRouter.get("/all",getShows)
showRouter.get("/:movieID",getShow)
showRouter.get("/single/:showId", getSingleShow);


export default showRouter;