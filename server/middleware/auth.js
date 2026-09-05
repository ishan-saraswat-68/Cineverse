import { clerkClient } from "@clerk/express";
import { response } from "express";

export const protectAdmin = async (req,res,next)=>{
    try {
        const {userId} = req.auth;

        const user = await clerkClient.users.getUser(userId);
        
        // checking if the user is admin
        if(user.privateMetadata.role !== 'admin'){
            return response.json({success:false,message:'Only admin can add shows'})
        }
        else{
            next();
        }
    }
    catch(error){
        console.error(error);
        res.status(500).json({message:error.message});
    }
}