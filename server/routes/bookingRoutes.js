import express from "express";
import { createBooking, getOccupiedSeats, releaseSeatsManually } from "../controllers/bookingController.js";

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showID', getOccupiedSeats);
bookingRouter.post('/release-seats', releaseSeatsManually);

export default bookingRouter;

