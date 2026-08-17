const {
    resolveApiKey
} = require("../services/apiKeyService");

const Project = require("../models/Project");


const project = async (req, res, next) => {

    try {

        const projectKey =
            req.headers["x-api-key"];

        console.log(
            "[PROJECT MIDDLEWARE] X-API-Key present:",
            Boolean(projectKey)
        );

        console.log(
            "[PROJECT MIDDLEWARE] X-API-Key length:",
            projectKey ? projectKey.length : 0
        );

        console.log(
            "[PROJECT MIDDLEWARE] X-Project-ID:",
            req.headers["x-project-id"] || null
        );


        if (!projectKey) {

            return res.status(400).json({
                success: false,
                message: "Project API key is missing"
            });

        }


        const result =
            await resolveApiKey(projectKey);


        console.log(
            "[PROJECT MIDDLEWARE] resolveApiKey result:",
            result
                ? {
                    source: result.source,
                    global: result.global,
                    projectId:
                        result.project?._id?.toString() || null,
                    permissions:
                        result.permissions
                }
                : null
        );


        if (!result) {

            return res.status(401).json({
                success: false,
                message: "Invalid project API key"
            });

        }


        /*
        |--------------------------------------------------------------------------
        | GLOBAL API KEY
        |--------------------------------------------------------------------------
        */

        if (result.global === true) {

            let targetProject =
                result.project || null;


            const requestedProjectId =
                req.headers["x-project-id"];


            if (requestedProjectId) {

                targetProject =
                    await Project.findOne({
                        _id: requestedProjectId,
                        status: "active"
                    });


                if (!targetProject) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Target project not found or inactive"
                    });

                }

            }


            req.project =
                targetProject;


            req.projectId =
                targetProject?._id || null;


            req.apiKey =
                result.apiKey;


            req.apiKeyPermissions =
                result.permissions;


            req.apiKeySource =
                "global";


            req.isGlobalApiKey =
                true;


            return next();

        }


        /*
        |--------------------------------------------------------------------------
        | NORMAL PROJECT KEY
        |--------------------------------------------------------------------------
        */

        if (!result.project) {

            return res.status(401).json({
                success: false,
                message:
                    "API key is not attached to a project"
            });

        }


        req.project =
            result.project;


        req.projectId =
            result.project._id;


        req.apiKey =
            result.apiKey;


        req.apiKeyPermissions =
            result.permissions;


        req.apiKeySource =
            result.source;


        req.isGlobalApiKey =
            false;


        next();


    } catch (error) {

        console.error(
            "PROJECT MIDDLEWARE ERROR:",
            error
        );


        return res.status(500).json({
            success: false,
            message:
                "Project authentication failed"
        });

    }

};


module.exports = project;
