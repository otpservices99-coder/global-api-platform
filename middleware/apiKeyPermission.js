const {
    hasPermission
} = require("../services/apiKeyService");


/*
|--------------------------------------------------------------------------
| API KEY PERMISSION MIDDLEWARE
|--------------------------------------------------------------------------
|
| Usage:
|
| apiKeyPermission("wallet.read")
|
| A key containing:
|
| ["*"]
|
| has access to everything.
|
| A key containing:
|
| ["wallet.read"]
|
| only has access to wallet.read.
|
*/


const apiKeyPermission = (requiredPermission) => {

    return (req, res, next) => {

        /*
        |--------------------------------------------------------------------------
        | Legacy keys
        |--------------------------------------------------------------------------
        |
        | Legacy Project.apiKeys are currently granted full access
        | for backward compatibility.
        |
        */

        if (req.apiKeySource === "legacy") {

            return next();

        }


        /*
        |--------------------------------------------------------------------------
        | No API key
        |--------------------------------------------------------------------------
        */

        if (!req.apiKey) {

            return res.status(401).json({

                success: false,

                message: "API key authentication required"

            });

        }


        /*
        |--------------------------------------------------------------------------
        | Check permission
        |--------------------------------------------------------------------------
        */

        if (
            !hasPermission(
                req.apiKey,
                requiredPermission
            )
        ) {

            return res.status(403).json({

                success: false,

                message: "API key does not have permission for this operation",

                requiredPermission

            });

        }


        next();

    };

};


module.exports = apiKeyPermission;
