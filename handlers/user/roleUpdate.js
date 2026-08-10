const User = require("../../models/User");
const Role = require("../../models/Role");

module.exports = {
    name: "user.role_update",

    execute: async (ctx) => {

        const role = await Role.findOne({
            _id: ctx.data.role,
            project: ctx.projectId
        });

        if (!role) {
            throw new Error("Role not found");
        }

        const user = await User.findOne({
            _id: ctx.userId,
            project: ctx.projectId
        });

        if (!user) {
            throw new Error("User not found");
        }

        user.role = role._id;

        await user.save();

        return {
            success: true,
            user
        };

    }
};
