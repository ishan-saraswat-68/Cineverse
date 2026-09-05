import Show from "../models/show.js";

// function to check availability of selected seats for a movie 

const checkAvailability = async(showID,selectedSeats)=>{
    try{
        const showData = await MovieShow.findById(showID);
        if(!showData){
            return false;
        }
        const occupiedSeats = showData.occupiedSeats;
        
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        return !isAnySeatTaken;

    }catch(error){
        console.error(error);
        return false;
    }
}

//function to create booking
export const createBooking = async(req,res)=>{
    try{
        const {showId,selectedSeats} = req.body;
        const {userId} = req.auth;
        const {origin} = req.headers;
        //check if the seat is available for the selected show 
        const isAvailable = await checkAvailability(showId,selectedSeats);
        
        if(!isAvailable){
            return res.status(400).json({success:false,message:'Selected Seats are not available. Choose different seats'});
        }
        // Get the show details 
        const showData = await Show.findById(showId).populate('movie');

        // create a new booking 
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats
        })

        selectedSeats.map((seat)=>{
            showData.occupiedSeats[seat]=user.id
        })

        showData.markModified('occupiedSeats');

        await showData.save();

        // strip Gateway intialization 
        
        res.json({success:true,message:'Booking created successfully'});
    }catch(error){
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}


export const getOccupiedSeats = async(req,res)=>{
    try {
        const {showID} = req.params;
        const showData = await Show.findById(showID);
        const occupiedSeats = Object.keys(showData.occupiedSeats);
        
        res.json({success:true,occupiedSeats:occupiedSeats});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:error.message});
    }
}