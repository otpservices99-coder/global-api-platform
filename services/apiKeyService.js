const crypto = require("crypto");

const connectDB = require("../config/database");

const resolveApiKey = async (key) => {
    if (!key) {
        return null;
    }

    const db = await connectDB();

    /*
    |--------------------------------------------------------------------------
    | NEW API KEY SYSTEM
    |--------------------------------------------------------------------------
    */

    console.log("[API KEY] Before MongoDB query");

    const apiKey = await db.collection("apikeys").findOne({
        key,
        active: true
    });

    console.log(
        "[API KEY] MongoDB query completed:",
        Boolean(apiKey)
    );

    if (apiKey) {
        /*
        |--------------------------------------------------------------------------
        | GLOBAL KEY
        |--------------------------------------------------------------------------
        */

        if (apiKey.scope === "global") {
            let project = null;

            if (apiKey.project) {
                project = await db.collection("projects").findOne({
                    _id: apiKey.project
                });
            }

            return {
                project,
                apiKey,
                permissions: apiKey.permissions || ["*"],
                source: "global",
                global: true
            };
        }

        /*
        |--------------------------------------------------------------------------
        | PROJECT KEY
        |--------------------------------------------------------------------------
        */

        if (!apiKey.project) {
            return null;
        }

        const project = await db.collection("projects").findOne({
            _id: apiKey.project,
            status: "active"
        });

        if (!project) {
            return null;
        }

        return {
            project,
            apiKey,
            permissions: apiKey.permissions || ["*"],
            source: "apiKey",
            global: false
        };
    }

    /*
    |--------------------------------------------------------------------------
    | LEGACY PROJECT API KEY SYSTEM
    |--------------------------------------------------------------------------
    */

    const project = await db.collection("projects").findOne({
        status: "active",
        apiKeys: {
            $elemMatch: {
                key,
                status: "active"
            }
        }
    });

    if (!project) {
        return null;
    }

    const legacyKey = (project.apiKeys || []).find(
        (item) =>
            item.key === key &&
            item.status === "active"
    );

    return {
        project,
        apiKey: legacyKey || null,
        permissions: ["*"],
        source: "legacy",
        global: false
    };
};

const generateApiKey = () => {
    return crypto
        .randomBytes(32)
        .toString("hex");
};

const hasPermission = (apiKey, permission) => {
    if (!apiKey) {
        return false;
    }

    const permissions =
        apiKey.permissions || ["*"];

    if (permissions.includes("*")) {
        return true;
    }

    return permissions.includes(permission);
};

module.exports = {
    resolveApiKey,
    generateApiKey,
    hasPermission
};
