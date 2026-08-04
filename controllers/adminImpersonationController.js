const jwt = require("jsonwebtoken");
const User = require("../models/User");
const audit = require("../services/auditService");

const loginAsUser = async (req, res) => {

    try {

        const user = await User.findOne({
            _id: req.params.id,
            project: req.project._id
        }).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                impersonated: true
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        await audit.log({

            project: req.project._id,

            actor: req.user.id,

            user: user._id,

            action: "user.impersonate",

            resource: "user",

            metadata: {
                username: user.username,
                email: user.email
            },

            req

        });

        res.json({

            success: true,

            token,

            user

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {
    loginAsUser
};
