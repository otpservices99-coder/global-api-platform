const {
    resolveApiKey
} = require("../services/apiKeyService");



const project = async (req, res, next) => {

    try {

        const projectKey =
            req.headers["x-api-key"];


        if (!projectKey) {

            return res.status(400).json({

                success: false,

                message: "Project API key is missing"

            });

        }


        const result =
            await resolveApiKey(projectKey);


        if (!result) {

            return res.status(401).json({

                success: false,

                message: "Invalid project API key"

            });

        }


        /*
        |--------------------------------------------------------------------------
        | Attach project
        |--------------------------------------------------------------------------
        */

        req.project =
            result.project;


        /*
        |--------------------------------------------------------------------------
        | Attach API key
        |--------------------------------------------------------------------------
        */

        req.apiKey =
            result.apiKey;


        /*
        |--------------------------------------------------------------------------
        | Attach permissions
        |--------------------------------------------------------------------------
        */

        req.apiKeyPermissions =
            result.permissions;


        /*
        |--------------------------------------------------------------------------
        | Identify API key source
        |--------------------------------------------------------------------------
        */

        req.apiKeySource =
            result.source;


        next();


    } catch (error) {

        console.error(
            "PROJECT MIDDLEWARE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Project authentication failed"

        });

    }

};



module.exports = project;
