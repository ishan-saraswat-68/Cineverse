import express from "express";
import { getFavouriteMovies, getUserBookings, updateFavouriteMovie } from "../controllers/userController.js";

const userRouter = express.Router();

// API route to get user bookings
userRouter.get('/bookings', getUserBookings);

// API route to update user favourites
userRouter.post('/favourites', updateFavouriteMovie);

// API route to get user favourites
userRouter.get('/favourites', getFavouriteMovies);



export default userRouter;