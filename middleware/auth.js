const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserRole = require("../models/UserRole");


/*
 * ============================================================
 * ACCOUNT STATUS HELPERS
 * ============================================================
 *
 * These helpers are intentionally centralized here so every
 * protected route receives the same account-status enforcement.
 *
 * Valid application statuses:
 *
 *     active
 *     suspended
 *     blocked
 *
 * Legacy "banned" is treated as "blocked".
 * ============================================================
 */

function normalizeAccountStatus(status) {

    const normalized =
        String(status || "")
            .trim()
            .toLowerCase();

    if (normalized === "banned") {
        return "blocked";
    }

    return normalized || "active";
}


function accountStatusResponse(status) {

    const normalized =
        normalizeAccountStatus(status);

    if (
        normalized === "suspended"
    ) {

        return {
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
            success: false,
            code: "ACCOUNT_BLOCKED",
            message:
                "Your account is blocked. Contact support."
        };

    }


    return null;
}


/*
 * ============================================================
 * PROTECT
 * ============================================================
 */

const protect = async (req, res, next) => {

    try {

        let token;


        /*
         * ====================================================
         * JWT EXTRACTION
         * ====================================================
         *
         * Expected header:
         *
         * Authorization: Bearer <JWT>
         *
         * Do NOT use the X-API-Key header for user JWT auth.
         * X-API-Key remains project/API authentication.
         * ====================================================
         */

        const authorization =
            req.headers.authorization || "";


        if (
            typeof authorization === "string" &&
            /^Bearer\s+/i.test(authorization)
        ) {

            token =
                authorization
                    .replace(/^Bearer\s+/i, "")
                    .trim();

        }


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Not authorized, no token"

            });

        }


        /*
         * ====================================================
         * VERIFY JWT
         * ====================================================
         */

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        if (
            !decoded ||
            !decoded.id
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired token"

            });

        }


        /*
         * ====================================================
         * LOAD CURRENT USER
         * ====================================================
         *
         * IMPORTANT:
         *
         * Status is read from MongoDB every request.
         *
         * Therefore an already-issued JWT immediately loses
         * normal user access after an admin changes the user
         * status to suspended or blocked.
         * ====================================================
         */

        const user =
            await User.findById(
                decoded.id
            )
            .select("-password");


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "User not found"

            });

        }


        /*
         * ====================================================
         * NORMALIZE LEGACY STATUS
         * ====================================================
         */

        const accountStatus =
            normalizeAccountStatus(
                user.status
            );


        /*
         * ====================================================
         * STAFF BYPASS
         * ====================================================
         *
         * Admin/super_admin accounts must still be able to
         * manage suspended/blocked users.
         *
         * Existing admin middleware remains responsible for
         * deciding whether the caller is actually authorized
         * for an admin route.
         *
         * platformRole "super_admin" is explicitly allowed.
         *
         * "admin" role is handled below through the populated
         * role assignments.
         * ====================================================
         */

        const isSuperAdmin =
            user.platformRole ===
            "super_admin";


        /*
         * ====================================================
         * ROLE ASSIGNMENTS
         * ====================================================
         */

        const assignments =
            await UserRole.find({

                user: user._id,

                project: user.project

            })
            .populate({

                path: "role",

                populate: {
                    path: "permissions"
                }

            });


        user.roles =
            assignments
                .map(
                    assignment =>
                        assignment.role
                )
                .filter(Boolean);


        const isAdminRole =
            user.roles.some(role => {

                const name =
                    String(
                        role.name ||
                        role.key ||
                        role.slug ||
                        ""
                    )
                    .trim()
                    .toLowerCase();

                return (
                    name === "admin" ||
                    name === "administrator" ||
                    name === "super_admin" ||
                    name === "superadmin"
                );

            });


        const isStaff =
            isSuperAdmin ||
            isAdminRole;


        /*
         * ====================================================
         * ACCOUNT STATUS ENFORCEMENT
         * ====================================================
         *
         * Staff bypass is deliberate.
         *
         * A suspended/blocked admin can still enter admin
         * routes and restore users.
         *
         * Normal users are blocked immediately.
         * ====================================================
         */

        if (
            !isStaff &&
            (
                accountStatus === "suspended" ||
                accountStatus === "blocked"
            )
        ) {

            const response =
                accountStatusResponse(
                    accountStatus
                );


            return res.status(403).json(
                response
            );

        }


        /*
         * ====================================================
         * EXPOSE CURRENT USER
         * ====================================================
         */

        req.user = user;


        /*
         * Keep compatibility with code that reads req.user.id.
         */

        req.user.id =
            user._id;


        /*
         * Keep the decoded token available to existing
         * middleware/controllers without changing contracts.
         */

        req.auth =
            decoded;


        next();

    } catch (error) {

        console.error(
            "AUTH MIDDLEWARE ERROR:",
            error
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token"

        });

    }

};


module.exports = protect;
module.exports.normalizeAccountStatus =
    normalizeAccountStatus;
module.exports.accountStatusResponse =
    accountStatusResponse;
