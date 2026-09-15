import { clerkClient } from "@clerk/express";
import Booking from "../models/booking.js";
import Movie from "../models/movie.js";

// API controller function to get user bookings
export const getUserBookings = async (req, res) => {
    try {
        const { userId } = req.auth();
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const bookings = await Booking.find({ user: userId }).populate({
            path: 'show',
            populate: { path: 'movie' }
        }).sort({ createdAt: -1 });
        res.json({ success: true, bookings: bookings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API controller function to update favourite movie in clerk user metadata 
export const updateFavouriteMovie = async (req, res) => {
    try {
        const { movieID } = req.body;
        const { userId } = req.auth();
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!movieID) return res.status(400).json({ success: false, message: 'Movie ID is required' });

        const user = await clerkClient.users.getUser(userId);
        let favourites = user.privateMetadata?.favourites || [];
        const movieIdStr = String(movieID);

        let isFavourite = favourites.some(id => String(id) === movieIdStr);
        let message = '';

        if (!isFavourite) {
            favourites.push(movieID);
            message = 'Added to favourites';
        } else {
            favourites = favourites.filter(id => String(id) !== movieIdStr);
            message = 'Removed from favourites';
        }

        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: {
                ...user.privateMetadata,
                favourites
            }
        });

        res.json({ success: true, message, isFavourite: !isFavourite });

    } catch (error) {
        console.error("Error updating favourite movie:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API controller to get the favourite movies of the user 
export const getFavouriteMovies = async (req, res) => {
    try {
        const { userId } = req.auth();
        if (!userId) return res.json({ success: true, movies: [] });
        const user = await clerkClient.users.getUser(userId);
        const favourites = user.privateMetadata?.favourites || [];
        const movies = await Movie.find({ _id: { $in: favourites } });
        res.json({ success: true, movies: movies });
    } catch (error) {
        console.error("Error fetching favourite movies:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}