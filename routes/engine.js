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

/**
 * @swagger
 * /api/v1/engine:
 *   post:
 *     summary: Execute a global action
 *     description: |
 *       Universal Action Engine gateway. Executes an enabled action
 *       using the project's action definition and configured handler
 *       or resource operation.
 *
 *       The payload is intentionally dynamic so future actions can be
 *       added without changing this endpoint.
 *     tags:
 *       - Universal Action Engine
 *     security:
 *       - apiKeyAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 example: wallet.credit
 *                 description: Name of the enabled action to execute.
 *               data:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Dynamic action input data.
 *                 example:
 *                   user: 6a7d0a8cc8d487879b905f13
 *                   amount: 25
 *                   description: Target User Credit
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Project API key.
 *     responses:
 *       200:
 *         description: Action executed successfully.
 *       400:
 *         description: Invalid action or request data.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Action or API key permission denied.
 *       404:
 *         description: Action not found.
 *       500:
 *         description: Action execution failed.
 */


// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// POST /api/v1/engine
//
// The route is only the gateway.
//
// API key
//   ↓
// Project
//   ↓
// Action definition
//   ↓
// Universal Action Engine
//   ↓
// Real operation
//   ↓
// Verified result
// ============================================================

router.post(
    "/",

    // ----------------------------------------------------------
    // OPTIONAL JWT
    // ----------------------------------------------------------

    async (
        req,
        res,
        next
    ) => {

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith(
                "Bearer "
            )
        ) {

            return protect(
                req,
                res,
                () => next()
            );
        }


        next();
    },


    // ----------------------------------------------------------
    // EXECUTION
    // ----------------------------------------------------------

    async (
        req,
        res
    ) => {

        try {

            // ----------------------------------------------------
            // PROJECT
            // ----------------------------------------------------

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


            // ----------------------------------------------------
            // ACTION NAME
            // ----------------------------------------------------

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


            // ----------------------------------------------------
            // DATA
            // ----------------------------------------------------

            const data =
                req.body?.data &&
                typeof req.body.data === "object" &&
                !Array.isArray(req.body.data)

                    ? req.body.data

                    : {};


            // ----------------------------------------------------
            // ACTION
            // ----------------------------------------------------

            const action =
                await Action.findOne({

                    project:
                        projectId,

                    name:
                        actionName,

                    enabled:
                        true
                });


            if (!action) {

                return res.status(404).json({

                    success: false,

                    message:
                        `Action '${actionName}' is not available`
                });
            }


            // ----------------------------------------------------
            // PERMISSION
            // ----------------------------------------------------

            let permitted = false;


            try {

                permitted =
                    hasPermission(
                        req.apiKey,
                        actionName
                    );

            } catch (error) {

                permitted = false;
            }


            if (!permitted) {

                permitted =
                    Array.isArray(
                        req.apiKeyPermissions
                    ) &&
                    (
                        req.apiKeyPermissions.includes("*") ||
                        req.apiKeyPermissions.includes(
                            actionName
                        )
                    );
            }


            if (!permitted) {

                return res.status(403).json({

                    success: false,

                    message:
                        "API key does not have permission to execute this action",

                    action:
                        actionName
                });
            }


            // ----------------------------------------------------
            // EVENT
            // ----------------------------------------------------

            const event = {

                project:
                    projectId,

                projectId,

                name:
                    `manual.${actionName}`,

                entityType:
                    "action",

                entityId:
                    action._id,

                actorId:
                    req.user?._id ||
                    req.user?.id ||
                    null,

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


            // ----------------------------------------------------
            // EXECUTE
            // ----------------------------------------------------

            const result =
                await processActions(

                    event,

                    [action]
                );


            // ----------------------------------------------------
            // VERIFY ACTUAL EXECUTION
            // ----------------------------------------------------

            const actionResult =
                Array.isArray(result)
                    ? result[0]
                    : result;


            if (
                !actionResult ||
                actionResult.success !== true
            ) {

                return res.status(422).json({

                    success: false,

                    action:
                        actionName,

                    result,

                    message:
                        actionResult?.error ||
                        actionResult?.message ||
                        "Action execution failed"
                });
            }


            // ----------------------------------------------------
            // REAL SUCCESS
            // ----------------------------------------------------

            return res.status(200).json({

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
                    error?.message ||
                    "Action execution failed"
            });
        }
    }
);


module.exports = router;
