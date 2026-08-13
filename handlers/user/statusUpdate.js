const User = require("../../models/User");

module.exports = {

    name: "user.status_update",

    execute: async (ctx) => {

        const projectId =
            ctx.projectId ||
            ctx.project?._id ||
            ctx.event?.project;

        const userId =
            ctx.userId ||
            ctx.data?.userId ||
            ctx.data?.user ||
            ctx.event?.userId;

        const status =
            ctx.data?.status;

        if (!projectId) {

            return {
                success: false,
                message: "Project ID is required"
            };

        }

        if (!userId) {

            return {
                success: false,
                message: "User ID is required"
            };

        }

        if (!status) {

            return {
                success: false,
                message: "User status is required"
            };

        }

        const allowedStatuses = [
            "active",
            "suspended",
            "blocked"
        ];

        if (!allowedStatuses.includes(status)) {

            return {
                success: false,
                message: "Invalid user status"
            };

        }

        const user = await User.findOne({
            _id: userId,
            project: projectId
        }).select("-password");

        if (!user) {

            return {
                success: false,
                message: "User not found"
            };

        }

        user.status = status;

        await user.save();

        /*
         * Convert to a plain object and explicitly
         * remove sensitive fields before returning.
         */

        const safeUser = user.toObject();

        delete safeUser.password;

        return {

            success: true,

            user: safeUser

        };

    }

};
