const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const Action = require("../models/Action");
const resourceService = require("../services/resourceService");
const {
    executeUniversalAction
} = require("../services/universalActionEngine");


// ============================================================
// HELPERS
// ============================================================

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

    const normalized = name.trim();

    if (
        !/^[a-zA-Z0-9_.-]+$/.test(normalized)
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


function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


// ============================================================
// RESOLVE RESOURCE OPERATION
// ============================================================
//
// Action configuration:
// {
//     resource: "user",
//     operation: "update"
// }
//
// Resource configuration is the source of truth for whether
// the operation is actually available.
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

    const normalizedResource =
        resourceName.trim();

    const normalizedOperation =
        operationName.trim();


    // --------------------------------------------------------
    // ENGINE-LEVEL SPECIAL OPERATION
    // --------------------------------------------------------

    if (
        normalizedResource === "system" &&
        normalizedOperation === "ping"
    ) {
        return {
            valid: true,
            resource: null,
            operation: normalizedOperation,
            actualOperation: "ping",
            special: true
        };
    }


    const resource =
        await resourceService.getResource({
            projectId,
            resource: normalizedResource
        });


    if (!resource) {
        return {
            valid: false,
            message:
                `Resource '${normalizedResource}' not found`
        };
    }


    if (resource.enabled === false) {
        return {
            valid: false,
            message:
                `Resource '${normalizedResource}' is disabled`
        };
    }


    const operations =
        resource.settings?.operations || {};

    const definition =
        operations[normalizedOperation];


    if (definition === false) {
        return {
            valid: false,
            message:
                `Operation '${normalizedOperation}' is disabled for resource '${normalizedResource}'`
        };
    }


    if (definition === true) {
        return {
            valid: true,
            resource,
            operation: normalizedOperation,
            actualOperation: normalizedOperation,
            definition: true
        };
    }


    if (
        definition === undefined ||
        definition === null
    ) {
        return {
            valid: false,
            message:
                `Operation '${normalizedOperation}' is not configured for resource '${normalizedResource}'`
        };
    }


    if (
        typeof definition !== "object" ||
        Array.isArray(definition)
    ) {
        return {
            valid: false,
            message:
                `Operation '${normalizedOperation}' is configured incorrectly`
        };
    }


    if (
        typeof definition.operation !== "string" ||
        !definition.operation.trim()
    ) {
        return {
            valid: false,
            message:
                `Operation '${normalizedOperation}' is configured incorrectly`
        };
    }


    return {
        valid: true,
        resource,
        operation: normalizedOperation,
        actualOperation:
            definition.operation.trim(),
        definition
    };
}


// ============================================================
// BUILD ACTION DATA
// ============================================================

function buildActionPayload(body = {}) {

    const payload = {};

    if (body.name !== undefined) {
        payload.name = body.name;
    }

    if (body.description !== undefined) {
        payload.description = body.description;
    }

    if (body.enabled !== undefined) {
        payload.enabled = body.enabled !== false;
    }

    if (body.type !== undefined) {
        payload.type = body.type;
    }

    if (
        body.config !== undefined
    ) {
        payload.config = body.config;
    }

    return payload;
}


// ============================================================
// AUTHORIZATION
// ============================================================
//
// The server already applies project + apiUsage middleware.
// This route additionally protects action-management operations
// with the existing authentication/admin middleware.
// ============================================================

router.use(protect);
router.use(admin);


// ============================================================
// LIST ACTIONS
// ============================================================
//
// GET /api/v1/actions
// ============================================================

router.get("/", async (req, res) => {

    try {

        const actions =
            await Action.find({
                project: req.project._id
            })
            .sort({
                createdAt: -1
            });


        return res.json({
            success: true,
            data: actions
        });

    } catch (error) {

        console.error(
            "[ACTIONS LIST ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// GET SINGLE ACTION
// ============================================================
//
// GET /api/v1/actions/:id
// ============================================================

router.get("/:id", async (req, res) => {

    try {

        const action =
            await Action.findOne({
                _id: req.params.id,
                project: req.project._id
            });


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        return res.json({
            success: true,
            data: action
        });

    } catch (error) {

        console.error(
            "[ACTION GET ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// CREATE ACTION
// ============================================================
//
// POST /api/v1/actions
//
// Example:
//
// {
//   "name": "user.unsuspend",
//   "description": "Unsuspend user",
//   "enabled": true,
//   "config": {
//      "resource": "user",
//      "operation": "update",
//      "id": "{{data.user}}",
//      "data": {
//          "status": "active"
//      }
//   }
// }
// ============================================================

router.post("/", async (req, res) => {

    try {

        const validation =
            validateActionName(req.body.name);


        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }


        const config =
            isPlainObject(req.body.config)
                ? req.body.config
                : {};


        const resource =
            config.resource;

        const operation =
            config.operation;


        if (
            !resource ||
            !operation
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Action config.resource and config.operation are required"
            });
        }


        const operationValidation =
            await resolveConfiguredOperation(
                req.project._id,
                resource,
                operation
            );


        if (!operationValidation.valid) {
            return res.status(400).json({
                success: false,
                message:
                    operationValidation.message
            });
        }


        const existing =
            await Action.findOne({
                project: req.project._id,
                name: validation.name
            });


        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Action already exists"
            });
        }


        const payload =
            buildActionPayload(req.body);


        payload.project =
            req.project._id;

        payload.name =
            validation.name;

        payload.config =
            config;


        const action =
            await Action.create(payload);


        return res.status(201).json({
            success: true,
            message: "Action created",
            data: action
        });

    } catch (error) {

        console.error(
            "[ACTION CREATE ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// UPDATE ACTION
// ============================================================
//
// PUT /api/v1/actions/:id
// ============================================================

router.put("/:id", async (req, res) => {

    try {

        const action =
            await Action.findOne({
                _id: req.params.id,
                project: req.project._id
            });


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        if (
            req.body.name !== undefined
        ) {

            const validation =
                validateActionName(
                    req.body.name
                );


            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }


            const duplicate =
                await Action.findOne({
                    project: req.project._id,
                    name: validation.name,
                    _id: {
                        $ne: action._id
                    }
                });


            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Action already exists"
                });
            }


            action.name =
                validation.name;
        }


        if (
            req.body.description !== undefined
        ) {
            action.description =
                req.body.description;
        }


        if (
            req.body.enabled !== undefined
        ) {
            action.enabled =
                req.body.enabled === true;
        }


        if (
            req.body.type !== undefined
        ) {
            action.type =
                req.body.type;
        }


        if (
            req.body.config !== undefined
        ) {

            if (
                !isPlainObject(
                    req.body.config
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Action config must be an object"
                });
            }


            const config =
                req.body.config;


            if (
                !config.resource ||
                !config.operation
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Action config.resource and config.operation are required"
                });
            }


            const operationValidation =
                await resolveConfiguredOperation(
                    req.project._id,
                    config.resource,
                    config.operation
                );


            if (!operationValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message:
                        operationValidation.message
                });
            }


            action.config =
                config;
        }


        await action.save();


        return res.json({
            success: true,
            message: "Action updated",
            data: action
        });

    } catch (error) {

        console.error(
            "[ACTION UPDATE ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// DELETE ACTION
// ============================================================
//
// DELETE /api/v1/actions/:id
// ============================================================

router.delete("/:id", async (req, res) => {

    try {

        const action =
            await Action.findOneAndDelete({
                _id: req.params.id,
                project: req.project._id
            });


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        return res.json({
            success: true,
            message: "Action deleted",
            data: action
        });

    } catch (error) {

        console.error(
            "[ACTION DELETE ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// ENABLE ACTION
// ============================================================
//
// PATCH /api/v1/actions/:id/enable
// ============================================================

router.patch("/:id/enable", async (req, res) => {

    try {

        const action =
            await Action.findOneAndUpdate(
                {
                    _id: req.params.id,
                    project: req.project._id
                },
                {
                    $set: {
                        enabled: true
                    }
                },
                {
                    new: true
                }
            );


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        return res.json({
            success: true,
            message: "Action enabled",
            data: action
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// DISABLE ACTION
// ============================================================
//
// PATCH /api/v1/actions/:id/disable
// ============================================================

router.patch("/:id/disable", async (req, res) => {

    try {

        const action =
            await Action.findOneAndUpdate(
                {
                    _id: req.params.id,
                    project: req.project._id
                },
                {
                    $set: {
                        enabled: false
                    }
                },
                {
                    new: true
                }
            );


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        return res.json({
            success: true,
            message: "Action disabled",
            data: action
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// EXECUTE ACTION
// ============================================================
//
// POST /api/v1/actions/:id/execute
//
// Body:
//
// {
//     "data": {
//         "user": "...",
//         "amount": 500
//     }
// }
//
// This uses the SAME universalActionEngine.
// There is no second execution engine here.
// ============================================================

router.post("/:id/execute", async (req, res) => {

    try {

        const action =
            await Action.findOne({
                _id: req.params.id,
                project: req.project._id
            });


        if (!action) {
            return res.status(404).json({
                success: false,
                message: "Action not found"
            });
        }


        if (action.enabled === false) {
            return res.status(400).json({
                success: false,
                message: "Action is disabled"
            });
        }


        const data =
            isPlainObject(req.body?.data)
                ? req.body.data
                : (
                    isPlainObject(req.body)
                        ? req.body
                        : {}
                );


        const result =
            await executeUniversalAction(
                action,
                data,
                {
                    projectId:
                        req.project._id,
                    actorId:
                        req.user?._id ||
                        req.user?.id ||
                        null,
                    userId:
                        req.user?._id ||
                        req.user?.id ||
                        null,
                    req
                }
            );


        return res.json({
            success: true,
            action: action.name,
            result
        });

    } catch (error) {

        console.error(
            "[ACTION EXECUTE ERROR]",
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// EXECUTE ACTION BY NAME
// ============================================================
//
// POST /api/v1/actions/name/:name/execute
//
// This is useful for the dashboard and dynamic clients when
// they know the action name rather than MongoDB _id.
// ============================================================

router.post(
    "/name/:name/execute",
    async (req, res) => {

        try {

            const validation =
                validateActionName(
                    req.params.name
                );


            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }


            const action =
                await Action.findOne({
                    project: req.project._id,
                    name: validation.name
                });


            if (!action) {
                return res.status(404).json({
                    success: false,
                    message: "Action not found"
                });
            }


            if (action.enabled === false) {
                return res.status(400).json({
                    success: false,
                    message: "Action is disabled"
                });
            }


            const data =
                isPlainObject(req.body?.data)
                    ? req.body.data
                    : (
                        isPlainObject(req.body)
                            ? req.body
                            : {}
                    );


            const result =
                await executeUniversalAction(
                    action,
                    data,
                    {
                        projectId:
                            req.project._id,
                        actorId:
                            req.user?._id ||
                            req.user?.id ||
                            null,
                        userId:
                            req.user?._id ||
                            req.user?.id ||
                            null,
                        req
                    }
                );


            return res.json({
                success: true,
                action: action.name,
                result
            });

        } catch (error) {

            console.error(
                "[ACTION NAME EXECUTE ERROR]",
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
