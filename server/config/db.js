import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("MONGODB_URI is missing from environment variables!");
            return;
        }
        await mongoose.connect(`${uri}/cineverse_v2`);
        isConnected = true;
        console.log(`MongoDB connected successfully to ${mongoose.connection.host}`);
    } catch (error) {
        console.error("MongoDB Connection Error: " + error.message);
        process.exit(1);
    }
};

export default connectDB;