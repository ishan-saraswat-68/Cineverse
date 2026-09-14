import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = req.auth();

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await clerkClient.users.getUser(userId);

        // checking if the user is admin
        if (user.privateMetadata?.role !== 'admin') {
            return res.json({ success: false, message: 'Only admin can add shows' })
        }
        else {
            next();
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}