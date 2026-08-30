import { Inngest } from "inngest";
import User from "../models/User.js";
// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest function to save user data to the database
const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-from-clerk',
    triggers: [{ event: 'clerk/user.created' }]},
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data.data;
        const userData = {
            _id: id,
            name: first_name + ' ' + last_name,
            email: email_addresses[0].email_address,
            image: image_url
        };

        console.log("User data received:", userData);
        await User.create(userData);
        return { message: 'User created successfully' };
    }
)

// Inngest function to delete user from database when user is deleted from clerk
const syncUserDeletion = inngest.createFunction(
    { id: 'delete-user-with-clerk' ,triggers: [{ event: 'clerk/user.deleted' }]},
    async ({ event }) => {
        const { id } = event.data.data;
        await User.findByIdAndDelete(id);
        return { message: 'User deleted successfully' };
    }
)

// inngest function to update user from clerk
const syncUserUpdate = inngest.createFunction(
    { id: 'update-user-with-clerk' ,triggers: [{ event: 'clerk/user.updated' }]},
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data.data;
        const userData = {
            _id: id,
            name: first_name + ' ' + last_name,
            email: email_addresses[0].email_address,
            image: image_url
        };

        console.log("User data received:", userData);
        await User.findByIdAndUpdate(id,userData);
        return { message: 'User created successfully' };
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion,syncUserUpdate];