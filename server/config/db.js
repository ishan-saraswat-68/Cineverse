import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/cineverse_v2`);
        console.log(`MongoDB connected successfully to ${mongoose.connection.host}`);
    } catch (error) {
        console.error("Error: " + error.message);
        process.exit(1);
    }
};

export default connectDB;