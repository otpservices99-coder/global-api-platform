const User = require("../../models/User");

module.exports = {
    name: "user.unsuspend",

    execute: async (ctx) => {
        const projectId =
            ctx.projectId ||
            ctx.project?._id ||
            ctx.event?.project;

        const userId =
            ctx.data?.userId ||
            ctx.data?.user ||
            ctx.userId ||
            ctx.event?.userId;

        if (!projectId)
            return { success:false, message:"Project ID is required" };

        if (!userId)
            return { success:false, message:"User ID is required" };

        const user = await User.findOne({
            _id:userId,
            project:projectId
        }).select("-password");

        if (!user)
            return { success:false, message:"User not found" };

        if (user.status === "blocked")
            return {
                success:false,
                message:"Blocked users cannot be unsuspended"
            };

        if (user.status === "active")
            return {
                success:true,
                message:"User is already active",
                user:user.toObject()
            };

        user.status = "active";
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        return {
            success:true,
            message:"User unsuspended successfully",
            user:safeUser
        };
    }
};
