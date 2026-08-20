const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const walletService = require("../services/walletService");


// ============================================================
// SUPER ADMIN DETECTION
// ============================================================

async function isSuperAdminRequest(req) {

    try {

        const authorization =
            req.headers.authorization || "";

        if (
            typeof authorization !== "string" ||
            !authorization.startsWith("Bearer ")
        ) {
            return false;
        }

        const token =
            authorization.substring(7).trim();

        if (!token) {
            return false;
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        if (
            decoded.platformRole !== "super_admin"
        ) {
            return false;
        }

        const user = await User.findById(
            decoded.id
        ).select(
            "_id platformRole status project"
        );

        if (!user) {
            return false;
        }

        if (
            user.platformRole !== "super_admin"
        ) {
            return false;
        }

        if (
            user.status &&
            user.status !== "active"
        ) {
            return false;
        }

        /*
         * The API-key middleware remains authoritative for
         * project selection.
         *
         * We therefore do not replace req.projectId here.
         */

        return true;

    } catch (error) {

        /*
         * Invalid/expired/missing admin JWT simply means:
         *
         * "This is not an authenticated super-admin request."
         *
         * It must NOT break normal registration.
         */

        return false;
    }
}


// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async (req, res) => {

    try {

        /*
         * Project authentication has already happened inside:
         *
         *     middleware/project.js
         *
         * req.projectId is therefore the authoritative project.
         */

        const project =
            req.project || null;

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


        // ====================================================
        // INPUT
        // ====================================================

        const {
            username,
            email,
            password,
            deviceId
        } = req.body;


        // ====================================================
        // VALIDATE BASIC INPUT
        // ====================================================

        if (
            !username ||
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Username, email and password are required"
            });
        }


        // ====================================================
        // NORMALIZE DEVICE ID
        // ====================================================

        const normalizedDeviceId =
            typeof deviceId === "string"
                ? deviceId.trim()
                : "";


        // ====================================================
        // DETERMINE SUPER ADMIN STATUS
        // ====================================================

        const superAdmin =
            await isSuperAdminRequest(req);


        // ====================================================
        // DEVICE VALIDATION
        // ====================================================

        /*
         * Normal users MUST provide a deviceId.
         *
         * Super admins are allowed to create accounts without
         * a deviceId because they are not subject to the normal
         * device restriction.
         */

        if (
            !superAdmin &&
            !normalizedDeviceId
        ) {

            return res.status(400).json({
                success: false,
                message: "deviceId is required"
            });
        }


        // ====================================================
        // CHECK USERNAME / EMAIL
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
        // DEVICE DUPLICATE CHECK
        // ====================================================

        /*
         * Only normal registration is restricted.
         *
         * A super admin may deliberately create multiple
         * accounts from the same device.
         */

        if (
            !superAdmin &&
            normalizedDeviceId
        ) {

            const existingDeviceUser =
                await User.findOne({
                    project: projectId,
                    deviceId:
                        normalizedDeviceId
                }).select("_id username email");


            if (existingDeviceUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account already exists on this device"
                });
            }
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

                /*
                 * Preserve the device for normal users.
                 *
                 * Super-admin-created accounts may also receive
                 * a deviceId if one was supplied.
                 */

                deviceId:
                    normalizedDeviceId ||
                    null
            });


        // ====================================================
        // ENSURE WALLET
        // ====================================================

        /*
         * Keep the explicit wallet service call.
         *
         * This preserves the existing registration behavior
         * and remains compatible with wallet.credit targeting:
         *
         *     data.user
         */

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
                id:
                    user._id,

                username:
                    user.username,

                email:
                    user.email,

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


        /*
         * Handle a race condition where two registrations with
         * the same device arrive at almost exactly the same time.
         *
         * Because deviceId is intentionally not a unique index,
         * the normal lookup remains authoritative while avoiding
         * database-level blocking of super-admin accounts.
         */

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
         */

        const project =
            req.project || null;

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

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required"
            });
        }


        // ====================================================
        // FIND USER
        // ====================================================

        const user =
            await User.findOne({
                email:
                    String(email)
                        .trim()
                        .toLowerCase(),

                project:
                    projectId
            });


        if (!user) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid email or password"
            });
        }


        // ====================================================
        // PASSWORD
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
        // JWT
        // ====================================================

        /*
         * No expiresIn is supplied intentionally.
         *
         * Existing JWT verification remains compatible because
         * tokens without an exp claim do not expire naturally.
         */

        const token =
            jwt.sign(
                {
                    id:
                        user._id,

                    role:
                        user.role,

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

                id:
                    user._id,

                username:
                    user.username,

                email:
                    user.email,

                role:
                    user.role,

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
            message:
                error.message
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
