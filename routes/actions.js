const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const Action = require("../models/Action");

const resourceService =
    require("../services/resourceService");


// ============================================================
// HELPERS
// ============================================================

function isPlainObject(value) {

    return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}


function validateActionName(name) {

    if (
        typeof name !== "string" ||
        !name.trim()
    ) {

        return {
            valid: false,
            message: "Action name is required"
        };

    }

    const normalized =
        name.trim();

    if (
        !/^[a-zA-Z0-9_.-]+$/.test(
            normalized
        )
    ) {

        return {
            valid: false,
            message:
                "Action name may only contain letters, numbers, dots, hyphens and underscores"
        };

    }

    return {
        valid: true,
        name: normalized
    };

}


// ============================================================
// RESOLVE RESOURCE OPERATION
// ============================================================
//
// Single source of truth for Action validation.
//
// Actions reference:
//   resource + operation
//
// Resource configuration determines what actually executes.
//
// This keeps the Action system completely dynamic.
// ============================================================

async function resolveConfiguredOperation(
    projectId,
    resourceName,
    operationName
) {
    if (
        typeof resourceName !== "string" ||
        !resourceName.trim()
    ) {
        return {
            valid: false,
            message: "Action resource is required"
        };
    }

    if (
        typeof operationName !== "string" ||
        !operationName.trim()
    ) {
        return {
            valid: false,
            message: "Action operation is required"
        };
    }

    const resource =
        await resourceService.getResource({
            projectId,
            resource: resourceName.trim()
        });

    if (!resource) {
        return {
            valid: false,
            message:
                `Resource '${resourceName}' not found`
        };
    }

    /*
     * Global special operations.
     *
     * These are handled by the universal engine itself
     * and therefore do not require a database operation
     * definition.
     */
    if (
        resourceName.trim() === "system" &&
        operationName.trim() === "ping"
    ) {
        return {
            valid: true,
            resource,
            operation: operationName.trim(),
            actualOperation: "ping",
            special: true
        };
    }

    const operations =
        resource.settings?.operations || {};

    const definition =
        operations[operationName.trim()];

    if (definition === false) {
        return {
            valid: false,
            message:
                `Operation '${operationName}' is disabled for resource '${resourceName}'`
        };
    }

    if (
        !definition ||
        typeof definition !== "object"
    ) {
        return {
            valid: false,
            message:
                `Operation '${operationName}' is not configured for resource '${resourceName}'`
        };
    }

    if (
        typeof definition.operation !== "string" ||
        !definition.operation.trim()
    ) {
        return {
            valid: false,
            message:
                `Operation '${operationName}' is configured incorrectly`
        };
    }

    return {
        valid: true,
        resource,
        operation: operationName.trim(),
        actualOperation:
            definition.operation.trim(),
        definition
    };
}


// ============================================================
// VALIDATE ONE ACTION STEP
// ============================================================

async function validateActionStep(
    projectId,
    step,
    index
) {
    if (!isPlainObject(step)) {
        return {
            valid: false,
            message:
                `Action step ${index + 1} must be an object`
        };
    }

    const result =
        await resolveConfiguredOperation(
            projectId,
            step.resource,
            step.operation
        );

    if (!result.valid) {
        return {
            valid: false,
            message:
                `Action step ${index + 1}: ${result.message}`
        };
    }

    return {
        valid: true,
        operation: result
    };
}


// ============================================================
// VALIDATE ACTION CONFIGURATION
// ============================================================

async function validateActionConfig(
    projectId,
    config
) {
    if (!isPlainObject(config)) {
        return {
            valid: false,
            message:
                "Action config must be an object"
        };
    }


    // ========================================================
    // COMPOSED ACTION
    // ========================================================

    if (config.steps !== undefined) {
        if (
            !Array.isArray(config.steps) ||
            config.steps.length === 0
        ) {
            return {
                valid: false,
                message:
                    "Action steps must be a non-empty array"
            };
        }

        for (
            let i = 0;
            i < config.steps.length;
            i++
        ) {
            const result =
                await validateActionStep(
                    projectId,
                    config.steps[i],
                    i
                );

            if (!result.valid) {
                return result;
            }
        }

        return {
            valid: true
        };
    }


    // ========================================================
    // HANDLER ACTION
    // ========================================================
    //
    // Keep compatibility with the existing handler system.
    // No handler is required for universal actions.
    //

    if (
        config.resource === undefined &&
        config.operation === undefined
    ) {
        if (
            config.handler !== undefined
        ) {
            if (
                typeof config.handler !== "string" ||
                !config.handler.trim()
            ) {
                return {
                    valid: false,
                    message:
                        "Action handler must be a non-empty string"
                };
            }
        }

        return {
            valid: true
        };
    }


    // ========================================================
    // NORMAL UNIVERSAL ACTION
    // ========================================================

    const result =
        await resolveConfiguredOperation(
            projectId,
            config.resource,
            config.operation
        );

    if (!result.valid) {
        return result;
    }

    return {
        valid: true,
        operation: result
    };
}


// ============================================================
// CREATE ACTION
// ============================================================

router.post(
    "/",
    project,
    protect,
    admin,

    async (req, res) => {

        try {

            const nameValidation =
                validateActionName(
                    req.body?.name
                );


            if (!nameValidation.valid) {

                return res.status(400).json({

                    success: false,

                    message:
                        nameValidation.message

                });

            }


            const name =
                nameValidation.name;


            /*
             * Prevent duplicate action names
             * inside the same project.
             */

            const existing =
                await Action.findOne({

                    project:
                        req.project._id,

                    name

                });


            if (existing) {

                return res.status(409).json({

                    success: false,

                    message:
                        `Action '${name}' already exists`

                });

            }


            const config =
                req.body?.config || {};


            const validation =
                await validateActionConfig(

                    req.project._id,

                    config

                );


            if (!validation.valid) {

                return res.status(400).json({

                    success: false,

                    message:
                        validation.message

                });

            }


            const action =
                await Action.create({

                    project:
                        req.project._id,

                    name,

                    description:
                        typeof req.body?.description === "string"
                            ? req.body.description
                            : "",

                    enabled:
                        req.body?.enabled === undefined
                            ? true
                            : Boolean(
                                req.body.enabled
                            ),

                    config

                });


            return res.status(201).json({

                success: true,

                message:
                    "Action created",

                data:
                    action

            });

        } catch (error) {

            console.error(
                "CREATE ACTION ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// GET ACTIONS
// ============================================================

router.get(
    "/",
    project,
    protect,
    admin,

    async (req, res) => {

        try {

            const actions =
                await Action.find({

                    project:
                        req.project._id

                })
                .sort({
                    name: 1
                });


            return res.json({

                success: true,

                data:
                    actions

            });

        } catch (error) {

            console.error(
                "GET ACTIONS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// GET SINGLE ACTION
// ============================================================

router.get(
    "/:id",
    project,
    protect,
    admin,

    async (req, res) => {

        try {

            const action =
                await Action.findOne({

                    _id:
                        req.params.id,

                    project:
                        req.project._id

                });


            if (!action) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Action not found"

                });

            }


            return res.json({

                success: true,

                data:
                    action

            });

        } catch (error) {

            console.error(
                "GET ACTION ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE ACTION
// ============================================================

router.put(
    "/:id",
    project,
    protect,
    admin,

    async (req, res) => {

        try {

            const action =
                await Action.findOne({

                    _id:
                        req.params.id,

                    project:
                        req.project._id

                });


            if (!action) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Action not found"

                });

            }


            /*
             * Validate name only when supplied.
             */

            if (
                req.body.name !== undefined
            ) {

                const nameValidation =
                    validateActionName(
                        req.body.name
                    );


                if (
                    !nameValidation.valid
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            nameValidation.message

                    });

                }


                const newName =
                    nameValidation.name;


                const duplicate =
                    await Action.findOne({

                        project:
                            req.project._id,

                        name:
                            newName,

                        _id: {
                            $ne:
                                action._id
                        }

                    });


                if (duplicate) {

                    return res.status(409).json({

                        success: false,

                        message:
                            `Action '${newName}' already exists`

                    });

                }


                action.name =
                    newName;

            }


            /*
             * Validate config only when it is being changed.
             */

            if (
                req.body.config !== undefined
            ) {

                const validation =
                    await validateActionConfig(

                        req.project._id,

                        req.body.config

                    );


                if (!validation.valid) {

                    return res.status(400).json({

                        success: false,

                        message:
                            validation.message

                    });

                }


                action.config =
                    req.body.config;

            }


            if (
                req.body.description !== undefined
            ) {

                action.description =
                    typeof req.body.description === "string"
                        ? req.body.description
                        : "";

            }


            if (
                req.body.enabled !== undefined
            ) {

                if (
                    typeof req.body.enabled !== "boolean"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Action enabled must be a boolean"

                    });

                }


                action.enabled =
                    req.body.enabled;

            }


            await action.save();


            return res.json({

                success: true,

                message:
                    "Action updated",

                data:
                    action

            });

        } catch (error) {

            console.error(
                "UPDATE ACTION ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ============================================================
// DELETE ACTION
// ============================================================
//
// IMPORTANT:
// This deletes ONLY the Action definition.
// It does NOT delete the project, resource, users,
// wallets, or any other project data.
// ============================================================

router.delete(
    "/:id",
    project,
    protect,
    admin,

    async (req, res) => {

        try {

            const result =
                await Action.deleteOne({

                    _id:
                        req.params.id,

                    project:
                        req.project._id

                });


            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Action not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Action deleted"

            });

        } catch (error) {

            console.error(
                "DELETE ACTION ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


module.exports = router;
