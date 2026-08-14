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

        /*
         * Keep the distinction between:
         *
         * role supplied with a value
         * role supplied as null
         * role not supplied at all
         *
         * null means REMOVE the user's role.
         */

        const hasRoleField =
            Object.prototype.hasOwnProperty.call(
                ctx.data || {},
                "role"
            ) ||
            Object.prototype.hasOwnProperty.call(
                ctx.data || {},
                "roleId"
            );

        const roleValue =
            Object.prototype.hasOwnProperty.call(
                ctx.data || {},
                "role"
            )
                ? ctx.data.role
                : ctx.data?.roleId;

        // ----------------------------------------------------
        // VALIDATE PROJECT
        // ----------------------------------------------------

        if (!projectId) {

            return {
                success: false,
                message: "Project ID is required"
            };

        }

        // ----------------------------------------------------
        // VALIDATE USER
        // ----------------------------------------------------

        if (!userId) {

            return {
                success: false,
                message: "User ID is required"
            };

        }

        // ----------------------------------------------------
        // ROLE FIELD MUST EXIST
        // ----------------------------------------------------

        if (!hasRoleField) {

            return {
                success: false,
                message: "Role ID is required"
            };

        }

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        const user =
            await User.findOne({

                _id: userId,

                project: projectId

            }).select("-password");

        if (!user) {

            return {
                success: false,
                message: "User not found"
            };

        }

        // ----------------------------------------------------
        // REMOVE ROLE
        // ----------------------------------------------------
        //
        // Sending:
        //
        // {
        //     "user": "...",
        //     "role": null
        // }
        //
        // removes the project role from the user.
        //
        // The Role document itself is NOT deleted.
        // ----------------------------------------------------

        if (
            roleValue === null ||
            roleValue === ""
        ) {

            user.role = null;

            await user.save();

            const safeUser =
                user.toObject();

            delete safeUser.password;

            return {

                success: true,

                user: safeUser

            };

        }

        // ----------------------------------------------------
        // ASSIGN ROLE
        // ----------------------------------------------------

        const role =
            await Role.findOne({

                _id: roleValue,

                project: projectId,

                enabled: true

            });

        if (!role) {

            return {
                success: false,
                message: "Role not found"
            };

        }

        // ----------------------------------------------------
        // UPDATE USER ROLE
        // ----------------------------------------------------

        user.role = role._id;

        await user.save();

        // ----------------------------------------------------
        // SAFE RESPONSE
        // ----------------------------------------------------

        const safeUser =
            user.toObject();

        delete safeUser.password;

        return {

            success: true,

            user: safeUser

        };

    }

};
