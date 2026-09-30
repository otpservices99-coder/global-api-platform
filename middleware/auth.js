const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const connectDB = require("../config/database");

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

    if (normalized === "suspended") {
        return {
            success: false,
            code: "ACCOUNT_SUSPENDED",
            message:
                "Your account is suspended. Contact support."
        };
    }

    if (normalized === "blocked") {
        return {
            success: false,
            code: "ACCOUNT_BLOCKED",
            message:
                "Your account is blocked. Contact support."
        };
    }

    return null;
}

function toObjectId(value) {
    if (!value) {
        return null;
    }

    if (value instanceof ObjectId) {
        return value;
    }

    if (ObjectId.isValid(value)) {
        return new ObjectId(value);
    }

    return null;
}

const protect = async (req, res, next) => {
    try {
        const authorization =
            req.headers.authorization || "";

        let token = null;

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

        const db = await connectDB();

        const userId =
            toObjectId(decoded.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid or expired token"
            });
        }

        const user =
            await db.collection("users").findOne({
                _id: userId
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User not found"
            });
        }

        delete user.password;

        const accountStatus =
            normalizeAccountStatus(
                user.status
            );

        const isSuperAdmin =
            user.platformRole === "super_admin";

        /*
         * Load role assignments.
         *
         * No assignment is valid for ordinary users.
         * It must NOT cause authentication to fail.
         */

        const assignments =
            await db.collection("userroles")
                .find({
                    user: userId
                })
                .toArray();

        const roleIds =
            assignments
                .map(item => item.role)
                .filter(Boolean)
                .map(toObjectId)
                .filter(Boolean);

        let roles = [];

        if (roleIds.length > 0) {
            roles =
                await db.collection("roles")
                    .find({
                        _id: {
                            $in: roleIds
                        }
                    })
                    .toArray();
        }

        /*
         * Load permissions only when roles exist.
         */

        const permissionIds =
            roles
                .flatMap(role =>
                    Array.isArray(role.permissions)
                        ? role.permissions
                        : []
                )
                .map(toObjectId)
                .filter(Boolean);

        let permissions = [];

        if (permissionIds.length > 0) {
            permissions =
                await db.collection("permissions")
                    .find({
                        _id: {
                            $in: permissionIds
                        }
                    })
                    .toArray();
        }

        const permissionMap =
            new Map(
                permissions.map(permission => [
                    String(permission._id),
                    permission
                ])
            );

        const roleMap =
            new Map(
                roles.map(role => [
                    String(role._id),
                    role
                ])
            );

        user.roles =
            assignments
                .map(assignment => {
                    const role =
                        roleMap.get(
                            String(assignment.role)
                        );

                    if (!role) {
                        return null;
                    }

                    return {
                        ...role,
                        permissions:
                            Array.isArray(role.permissions)
                                ? role.permissions
                                    .map(permissionId =>
                                        permissionMap.get(
                                            String(permissionId)
                                        )
                                    )
                                    .filter(Boolean)
                                : []
                    };
                })
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

        if (
            !isStaff &&
            (
                accountStatus === "suspended" ||
                accountStatus === "blocked"
            )
        ) {
            return res.status(403).json(
                accountStatusResponse(
                    accountStatus
                )
            );
        }

        req.user = user;
        req.user.id = user._id;
        req.auth = decoded;

        next();

    } catch (error) {
        console.error(
            "AUTH MIDDLEWARE ERROR:",
            error?.message || error
        );

        console.error(
            "AUTH MIDDLEWARE STACK:",
            error?.stack || error
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
