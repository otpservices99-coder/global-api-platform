const User = require("../../models/User");

module.exports = {
    name: "user.status_update",

    execute: async (ctx) => {

        const user = await User.findOne({
            _id: ctx.userId,
            project: ctx.projectId
        });

        if (!user) {
            throw new Error("User not found");
        }

        user.status = ctx.data.status;

        await user.save();

        return {
            success: true,
            user
        };

    }
};
