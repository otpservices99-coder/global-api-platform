const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const walletService =
    require("../services/walletService");

/*
 * ============================================================
 * ACCOUNT STATUS HELPERS
 * ============================================================
 */

function normalizeAccountStatus(status) {

    const normalized =
        String(status || "")
            .trim()
            .toLowerCase();

    return normalized === "banned"
        ? "blocked"
        : (normalized || "active");
}


function getAccountStatusError(status) {

    const normalized =
        normalizeAccountStatus(status);

    if (
        normalized === "suspended"
    ) {

        return {
            statusCode: 403,
            success: false,
            code: "ACCOUNT_SUSPENDED",
            message:
                "Your account is suspended. Contact support."
        };

    }


    if (
        normalized === "blocked"
    ) {

        return {
            statusCode: 403,
            success: false,
            code: "ACCOUNT_BLOCKED",
            message:
                "Your account is blocked. Contact support."
        };

    }


    return null;
}


const {
    ensureReferralCode,
    applyReferral
} = require("../services/referralService");


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
            authorization
                .substring(7)
                .trim();

        if (!token) {
            return false;
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        if (
            decoded.platformRole !==
            "super_admin"
        ) {
            return false;
        }

        const user =
            await User.findById(
                decoded.id
            ).select(
                "_id platformRole status project"
            );

        if (!user) {
            return false;
        }

        if (
            user.platformRole !==
            "super_admin"
        ) {
            return false;
        }

        if (
            user.status &&
            user.status !== "active"
        ) {
            return false;
        }

        return true;

    } catch (error) {

        return false;
    }
}


// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async (req, res) => {

    try {

        /*
         * Project authentication is already handled by:
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


        // ====================================================
        // INPUT
        // ====================================================

        const {
            username,
            email,
            password,
            deviceId,
            referralCode
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
        // NORMALIZE DEVICE
        // ====================================================

        const normalizedDeviceId =
            typeof deviceId === "string"
                ? deviceId.trim()
                : "";


        // ====================================================
        // NORMALIZE REFERRAL CODE
        // ====================================================

        const normalizedReferralCode =
            typeof referralCode === "string" &&
            referralCode.trim()
                ? referralCode
                    .trim()
                    .toUpperCase()
                : null;


        // ====================================================
        // SUPER ADMIN
        // ====================================================

        const superAdmin =
            await isSuperAdminRequest(req);


        // ====================================================
        // DEVICE VALIDATION
        // ====================================================

        if (
            !superAdmin &&
            !normalizedDeviceId
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "deviceId is required"
            });
        }


        // ====================================================
        // NORMALIZE USER DATA
        // ====================================================

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedUsername =
            String(username)
                .trim();


        // ====================================================
        // CHECK USERNAME / EMAIL
        // ====================================================

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

        if (
            !superAdmin &&
            normalizedDeviceId
        ) {

            const existingDeviceUser =
                await User.findOne({
                    project: projectId,
                    deviceId:
                        normalizedDeviceId
                }).select(
                    "_id username email"
                );


            if (existingDeviceUser) {

                return res.status(409).json({
                    success: false,
                    message:
                        "An account already exists on this device"
                });
            }
        }


        // ====================================================
        // VALIDATE REFERRAL CODE BEFORE USER CREATION
        // ====================================================
        //
        // This prevents creating an account and then discovering
        // that the referral code was invalid.
        //
        // We only validate existence here.
        // The actual reward is still controlled by referralService
        // and ReferralConfig.
        //

        let referralReferrer = null;

        if (normalizedReferralCode) {

            const referralProgram =
                await require(
                    "../services/referralService"
                ).getConfig(
                    projectId
                );

            if (
                !referralProgram ||
                referralProgram.enabled !== true
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Referral program is disabled"
                });
            }

            referralReferrer =
                await User.findOne({
                    project: projectId,
                    referralCode:
                        normalizedReferralCode
                }).select(
                    "_id username referralCode"
                );


            if (!referralReferrer) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid referral code"
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

                project:
                    projectId,

                username:
                    normalizedUsername,

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                deviceId:
                    normalizedDeviceId ||
                    null
            });


        // ====================================================
        // ENSURE WALLET
        // ====================================================

        await walletService.ensureWallet(
            projectId,
            user._id
        );


        // ====================================================
        // GENERATE USER'S OWN REFERRAL CODE
        // ====================================================
        //
        // Every user gets a referral code automatically.
        //

        await ensureReferralCode(
            user
        );


        // ====================================================
        // APPLY REFERRAL
        // ====================================================
        //
        // Important:
        //
        // The reward amount is NOT hardcoded here.
        //
        // referralService reads:
        //
        // ReferralConfig.rewardPerReferral
        //
        // Therefore you can later change the reward without
        // changing this registration controller.
        //

        let referralResult = {
            applied: false
        };

        if (
            normalizedReferralCode &&
            referralReferrer
        ) {

            try {

                referralResult =
                    await applyReferral({
                        projectId,
                        referredUserId:
                            user._id,
                        referralCode:
                            normalizedReferralCode
                    });

            } catch (referralError) {

                /*
                 * The user has already been created.
                 *
                 * We return the registration result but clearly
                 * report that the referral reward could not be
                 * applied.
                 *
                 * This avoids breaking normal account creation.
                 */

                console.error(
                    "REFERRAL APPLY ERROR:",
                    referralError
                );

                referralResult = {
                    applied: false,
                    error:
                        referralError.message
                };
            }
        }


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
                    projectId,

                referralCode:
                    user.referralCode,

                referredBy:
                    referralResult.applied
                        ? referralResult.referrerId
                        : null
            },

            referral: {

                applied:
                    referralResult.applied === true,

                reward:
                    referralResult.applied
                        ? referralResult.reward
                        : 0
            }
        });

    } catch (error) {

        console.error(
            "REGISTER USER ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Unable to create account"
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

        const accountStatusError =
            getAccountStatusError(
                user.status
            );


        if (accountStatusError) {

            return res.status(
                accountStatusError.statusCode
            ).json({

                success:
                    accountStatusError.success,

                code:
                    accountStatusError.code,

                message:
                    accountStatusError.message

            });

        }


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
        // ENSURE LEGACY USERS HAVE REFERRAL CODE
        // ====================================================

        await ensureReferralCode(
            user
        );


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
                    user.project,

                referralCode:
                    user.referralCode
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
    loginUser,
    normalizeAccountStatus,
    getAccountStatusError
};
