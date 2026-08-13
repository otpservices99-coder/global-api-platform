const express = require("express");

const router = express.Router();

const {
    processActions
} = require("../services/actionEngine");

const Action = require("../models/Action");

const {
    hasPermission
} = require("../services/apiKeyService");

const protect = require("../middleware/auth");


/*
|--------------------------------------------------------------------------
| GLOBAL ACTION ENGINE
|--------------------------------------------------------------------------
|
| POST /api/v1/engine
|
| Generic execution gateway for the entire platform.
|
| Request:
|
| {
|     "action": "wallet.credit",
|     "data": {
|         "user": "...",
|         "amount": 500
|     }
| }
|
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
|
| Project/API-key authentication is provided by:
|
|     middleware/project.js
|
| API-key permissions are checked here.
|
| JWT authentication is optional.
|
| This keeps the engine reusable for:
|
| - backend services
| - frontend applications
| - automation
| - workflows
| - integrations
| - admin systems
|
|--------------------------------------------------------------------------
*/


router.post(
    "/",
    async (req, res, next) => {

        /*
        |--------------------------------------------------------------------------
        | Optional JWT authentication
        |--------------------------------------------------------------------------
        |
        | If a Bearer token exists, load req.user.
        |
        | Requests without a JWT are still allowed to continue
        | because API-key authentication is the primary engine
        | authentication mechanism.
        |
        */

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {

            return protect(
                req,
                res,
                () => next()
            );

        }

        next();

    },
    async (req, res) => {

        try {

            /*
            |--------------------------------------------------------------------------
            | PROJECT CONTEXT
            |--------------------------------------------------------------------------
            */

            const projectId =
                req.project?._id ||
                req.project?.id ||
                req.projectId;

            if (!projectId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project context not available"

                });

            }


            /*
            |--------------------------------------------------------------------------
            | ACTION NAME
            |--------------------------------------------------------------------------
            */

            const actionName =
                String(
                    req.body?.action || ""
                ).trim();


            if (!actionName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Action name is required"

                });

            }


            /*
            |--------------------------------------------------------------------------
            | ACTION DATA
            |--------------------------------------------------------------------------
            */

            const data =
                req.body?.data &&
                typeof req.body.data === "object"
                    ? req.body.data
                    : {};


            /*
            |--------------------------------------------------------------------------
            | FIND ACTION
            |--------------------------------------------------------------------------
            */

            const action =
                await Action.findOne({

                    project: projectId,

                    name: actionName,

                    enabled: true

                });


            if (!action) {

                return res.status(404).json({

                    success: false,

                    message:
                        `Action '${actionName}' is not available`

                });

            }


            /*
            |--------------------------------------------------------------------------
            | API KEY PERMISSION
            |--------------------------------------------------------------------------
            |
            | Permission format:
            |
            |     resource.operation
            |
            | Examples:
            |
            |     wallet.credit
            |     wallet.debit
            |     withdrawal.request
            |     withdrawal.approve
            |     user.status_update
            |
            | Wildcard:
            |
            |     *
            |
            |--------------------------------------------------------------------------
            */

            const apiKeyPermission =
                hasPermission(
                    req.apiKey,
                    actionName
                );


            /*
            |--------------------------------------------------------------------------
            | FALLBACK TO RESOLVED PERMISSIONS
            |--------------------------------------------------------------------------
            |
            | The middleware also exposes:
            |
            |     req.apiKeyPermissions
            |
            | Support that value as well so the engine remains
            | compatible with both current and future API-key
            | implementations.
            |
            */

            const resolvedPermission =
                apiKeyPermission ||
                (
                    Array.isArray(
                        req.apiKeyPermissions
                    ) &&
                    (
                        req.apiKeyPermissions.includes("*") ||
                        req.apiKeyPermissions.includes(actionName)
                    )
                );


            if (!resolvedPermission) {

                return res.status(403).json({

                    success: false,

                    message:
                        "API key does not have permission to execute this action",

                    action:
                        actionName

                });

            }


            /*
            |--------------------------------------------------------------------------
            | BUILD EVENT
            |--------------------------------------------------------------------------
            */

            const event = {

                project:
                    projectId,

                name:
                    `manual.${actionName}`,

                entityType:
                    "action",

                entityId:
                    action._id,

                userId:
                    req.user?._id ||
                    req.user?.id ||
                    data.user ||
                    data.userId ||
                    null,

                data,

                req,

                metadata: {

                    source:
                        "global-engine",

                    method:
                        req.method,

                    path:
                        req.originalUrl,

                    ip:
                        req.ip,

                    userAgent:
                        req.get(
                            "user-agent"
                        ) || null,

                    apiKeySource:
                        req.apiKeySource ||
                        null

                }

            };


            /*
            |--------------------------------------------------------------------------
            | EXECUTE ACTION
            |--------------------------------------------------------------------------
            */

            const result =
                await processActions(

                    event,

                    [action]

                );


            /*
            |--------------------------------------------------------------------------
            | RESPONSE
            |--------------------------------------------------------------------------
            */

            return res.json({

                success: true,

                action:
                    actionName,

                result

            });


        } catch (error) {

            console.error(
                "GLOBAL ACTION ENGINE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Action execution failed"

            });

        }

    }
);


module.exports = router;
