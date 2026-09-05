import { clerkClient } from "@clerk/express";
import Booking from "../models/booking.js";
import Movie from "../models/movie.js";

// API controller function to get user bookings
export const getUserBookings = async(req,res)=>{
    try {
        const { user } = req.auth().userId;
        const bookings = await Booking.find({user}).populate({
            path: 'show',
            populate: {path: 'movie'}
        }).sort({createdAt: -1});
        res.json({success:true,bookings:bookings}); 
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}

// API controller function to update favourite movie in clerk user metadata 

export const updateFavouriteMovie = async(req,res)=>{
    try {
        const {movieID} = req.body;
        const {userId} = req.auth().userId;
        const user = await clerkClient.users.getUser(userId);

        if(!user.privateMetadata.favourites){
            user.privateMetadata.favourites = [];
        }

        if(!user.privateMetadata.favourites.includes(movieID)){
            user.privateMetadata.favourites.push(movieID);
        }

        else{
            user.privateMetadata.favourites = user.privateMetadata.favourites.filter(id=>id!==movieID);
        }

        await clerkClient.users.update(userId, {privateMetadata: user.privateMetadata});
        res.json({success:true,message:'Favourite movies updated successfully to user metadata'});
        
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}


// API controller to get the favourite movies of the user 

export const getFavouriteMovies = async(req,res)=>{
    try {
        const user = await clerkClient.users.getUser(userId);
        const favourites = user.privateMetadata.favourites;
        const movies = await Movie.find({_id: {$in: favourites}});
        res.json({success:true,movies:movies});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}