const crypto = require("crypto");

const ApiKey = require("../models/ApiKey");
const Project = require("../models/Project");


/*
|--------------------------------------------------------------------------
| API KEY SERVICE
|--------------------------------------------------------------------------
|
| Central API-key resolver for the entire platform.
|
| Supports:
|
| 1. New global ApiKey collection
| 2. Legacy Project.apiKeys
|
| The new ApiKey collection takes priority.
|
*/


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

        if (!apiKey.project) {
            return null;
        }


        if (apiKey.project.status !== "active") {
            return null;
        }


        /*
        |--------------------------------------------------------------------------
        | Update usage timestamp
        |--------------------------------------------------------------------------
        */

        apiKey.lastUsedAt = new Date();

        await apiKey.save();


        return {

            project: apiKey.project,

            apiKey,

            permissions: apiKey.permissions || ["*"],

            source: "apiKey"

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


    /*
    |--------------------------------------------------------------------------
    | Find legacy key
    |--------------------------------------------------------------------------
    */

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

        source: "legacy"

    };

};



/*
|--------------------------------------------------------------------------
| Generate API Key
|--------------------------------------------------------------------------
*/

const generateApiKey = () => {

    return crypto
        .randomBytes(32)
        .toString("hex");

};



/*
|--------------------------------------------------------------------------
| Check Permission
|--------------------------------------------------------------------------
*/

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
