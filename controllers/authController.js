const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const walletService = require("../services/walletService");


// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async (req, res) => {

    try {

        /*
         * Project authentication has already been performed
         * by middleware/project.js.
         */
        const project = req.project || null;

        const projectId =
            req.projectId ||
            project?._id ||
            null;

        if (!projectId) {

            return res.status(400).json({
                success: false,
                message: "Target project is required"
            });
        }


        const {
            username,
            email,
            password,
            deviceId
        } = req.body;


        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        if (!username || !email || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Username, email and password are required"
            });
        }


        /*
         * deviceId is required for normal account registration.
         *
         * This allows the platform to enforce one account per
         * device while keeping the API explicit.
         */
        if (!deviceId || typeof deviceId !== "string") {

            return res.status(400).json({
                success: false,
                message: "deviceId is required"
            });
        }

        const normalizedDeviceId =
            deviceId.trim();

        if (!normalizedDeviceId) {

            return res.status(400).json({
                success: false,
                message: "deviceId is required"
            });
        }


        // ====================================================
        // CHECK EXISTING USERNAME / EMAIL
        // ====================================================

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedUsername =
            String(username)
                .trim();


        const existingUser =
            await User.findOne({
                project: projectId,

                $or: [
                    {
                        email:
                            normalizedEmail
                    },
                    {
                        username:
                            normalizedUsername
                    }
                ]
            });


        if (existingUser) {

            return res.status(400).json({
                success: false,
                message:
                    "Username or email already exists"
            });
        }


        // ====================================================
        // DEVICE ACCOUNT PROTECTION
        // ====================================================
        //
        // IMPORTANT:
        //
        // A super_admin is allowed to create multiple accounts
        // from the same device.
        //
        // Normal users are limited to one account per device
        // inside the same project.
        //
        // This is checked at registration time rather than using
        // a MongoDB unique index because administrators must be
        // able to share the same deviceId.
        // ====================================================

        const existingDeviceUser =
            await User.findOne({
                project: projectId,
                deviceId: normalizedDeviceId,
                platformRole: {
                    $ne: "super_admin"
                }
            });


        if (existingDeviceUser) {

            return res.status(409).json({
                success: false,
                message:
                    "An account already exists on this device"
            });
        }


        // ====================================================
        // HASH PASSWORD
        // ====================================================

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // ====================================================
        // CREATE USER
        // ====================================================

        const user =
            await User.create({
                project: projectId,

                username:
                    normalizedUsername,

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                deviceId:
                    normalizedDeviceId,

                platformRole:
                    "user"
            });


        // ====================================================
        // ENSURE USER WALLET
        // ====================================================
        //
        // Keep this explicitly in registration.
        //
        // The User model also has its existing post-save wallet
        // protection, so this remains safe and idempotent.
        // ====================================================

        await walletService.ensureWallet(
            projectId,
            user._id
        );


        // ====================================================
        // SUCCESS
        // ====================================================

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully",

            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                project:
                    project?.name ||
                    projectId
            }
        });


    } catch (error) {

        console.error(
            "REGISTER USER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// LOGIN USER
// ============================================================

const loginUser = async (req, res) => {

    try {

        /*
         * API-key authentication has already happened in:
         *
         *     middleware/project.js
         *
         * req.projectId is the authoritative project.
         */

        const project = req.project || null;

        const projectId =
            req.projectId ||
            project?._id ||
            null;


        if (!projectId) {

            return res.status(400).json({
                success: false,
                message:
                    "Target project is required"
            });
        }


        const {
            email,
            password
        } = req.body;


        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required"
            });
        }


        // ====================================================
        // FIND USER INSIDE TARGET PROJECT
        // ====================================================

        const user =
            await User.findOne({
                email:
                    String(email)
                        .trim()
                        .toLowerCase(),

                project: projectId
            });


        if (!user) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid email or password"
            });
        }


        // ====================================================
        // COMPARE PASSWORD
        // ====================================================

        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!validPassword) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid email or password"
            });
        }


        // ====================================================
        // GENERATE JWT
        // ====================================================
        //
        // No expiration is intentionally configured.
        //
        // Existing engine authentication behavior remains
        // unchanged.
        // ====================================================

        const token =
            jwt.sign(
                {
                    id: user._id,
                    role: user.role,
                    platformRole:
                        user.platformRole,
                    project:
                        user.project
                },
                process.env.JWT_SECRET
            );


        // ====================================================
        // UPDATE LOGIN TIME
        // ====================================================

        user.lastLogin =
            new Date();

        await user.save();


        // ====================================================
        // SUCCESS
        // ====================================================

        return res.json({

            success: true,

            message:
                "Login successful",

            token,

            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                platformRole:
                    user.platformRole,
                project:
                    user.project
            }
        });


    } catch (error) {

        console.error(
            "LOGIN USER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    registerUser,
    loginUser
};
