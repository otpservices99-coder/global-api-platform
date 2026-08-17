const crypto = require("crypto");

const ApiKey = require("../models/ApiKey");
const Project = require("../models/Project");


const resolveApiKey = async (key) => {

    if (!key) {
        return null;
    }


    /*
    |--------------------------------------------------------------------------
    | NEW API KEY SYSTEM
    |--------------------------------------------------------------------------
    */

    const apiKey = await ApiKey.findOne({
        key,
        active: true
    }).populate("project");


    if (apiKey) {

        /*
        |--------------------------------------------------------------------------
        | GLOBAL KEY
        |--------------------------------------------------------------------------
        */

        if (apiKey.scope === "global") {

            apiKey.lastUsedAt = new Date();

            await apiKey.save();

            return {
                project: apiKey.project || null,
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


        if (apiKey.project.status !== "active") {
            return null;
        }


        apiKey.lastUsedAt = new Date();

        await apiKey.save();


        return {
            project: apiKey.project,
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

    const project = await Project.findOne({
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


    const legacyKey = project.apiKeys.find(
        item =>
            item.key === key &&
            item.status === "active"
    );


    if (legacyKey) {

        legacyKey.lastUsed = new Date();

        await project.save();
    }


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
