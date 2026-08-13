const User = require("../../models/User");
const Role = require("../../models/Role");

module.exports = {

    name: "user.role_update",

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

        const roleId =
            ctx.data?.role ||
            ctx.data?.roleId;

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

        if (!roleId) {

            return {
                success: false,
                message: "Role ID is required"
            };

        }

        const role = await Role.findOne({

            _id: roleId,

            project: projectId,

            enabled: true

        });

        if (!role) {

            return {
                success: false,
                message: "Role not found"
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

        user.role = role._id;

        await user.save();

        /*
         * Return only safe user data.
         */

        const safeUser = user.toObject();

        delete safeUser.password;

        return {

            success: true,

            user: safeUser

        };

    }

};
