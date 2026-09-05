import User from "../models/User.js";
import Booking from "../models/booking.js";
import Show from "../models/show.js";

// API to check user is admin 
export const isAdmin = async(req,res)=>{
    res.json({success:true,isAdmin:true});
}

// API to get Dashboard data 
export const getDashboardData = async(req,res)=>{
    try{
        const bookings = await Booking.find({isPaid:true});
        const activeShows = await Show.find({showDateTime:{$gte: new Date()}}).populate('movie');

        const totalUser = await User.countDocuments(); 
        const dashboardData = {
            totalBookings: bookings.length,
            totalRevenue: bookings.reduce((total,booking)=>total+booking.amount,0),
            totalUser:totalUser,
            activeShows: activeShows.length
        }
        res.json({success:true,dashboardData:dashboardData});
    }catch(error){
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}

// API to get all shows 

export const getAllShows = async(req,res)=>{
    try {
        const shows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie').sort({showDateTime: 1});
        res.json({success:true,shows:shows});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    } 
}


// API to get all bookings 

export const getAllBookings = async(req,res)=>{
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: 'show',
            populate: {path: 'movie'}
        }).sort({createdAt: -1});
        res.json({success:true,bookings:bookings});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}   
