const User = require("../models/User");

const searchUsers = async (req, res) => {

    try {

        const q = req.query.q || "";

        const users = await User.find({

            project: req.project._id,

            $or: [

                { username: { $regex: q, $options: "i" } },

                { email: { $regex: q, $options: "i" } }

            ]

        }).select("-password").limit(50);

        res.json({

            success: true,

            total: users.length,

            data: users

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {
    searchUsers
};
