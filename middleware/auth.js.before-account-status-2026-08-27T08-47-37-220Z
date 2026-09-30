const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserRole = require("../models/UserRole");

const protect = async (req, res, next) => {

    try {

        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {

            token = req.headers.authorization.split(" ")[1];

        }

        if (!token) {

            return res.status(401).json({

                success:false,
                message:"Not authorized, no token"

            });

        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id)
        .select("-password");

        if(!user){

            return res.status(401).json({

                success:false,
                message:"User not found"

            });

        }

        const assignments = await UserRole.find({

            user:user._id,
            project:user.project

        })
        .populate({

            path:"role",

            populate:{
                path:"permissions"
            }

        });

        user.roles = assignments.map(r=>r.role);

        req.user = user;

        next();

    } catch(error){

        console.error(error);

        return res.status(401).json({

            success:false,
            message:"Invalid or expired token"

        });

    }

};

module.exports = protect;
