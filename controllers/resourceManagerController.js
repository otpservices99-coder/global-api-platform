const Resource = require("../models/Resource");


// ============================================================
// GENERIC OPERATIONS
// ============================================================

const ALLOWED_OPERATIONS = [
    "create",
    "find",
    "findOne",
    "update",
    "delete",
    "increment",
    "decrement"
];


// ============================================================
// NORMALIZE OPERATIONS
// ============================================================
//
// Supported forms:
//
// "create": true
//
// "create": false
//
// "create": {
//     "operation": "create"
// }
//
// The manager preserves object definitions.
// ============================================================

function normalizeOperations(
    operations = {}
) {

    const normalized = {};

    for (
        const operation of ALLOWED_OPERATIONS
    ) {

        if (
            !Object.prototype.hasOwnProperty.call(
                operations,
                operation
            )
        ) {

            normalized[operation] = true;

            continue;
        }


        const value =
            operations[operation];


        if (
            value === true ||
            value === false
        ) {

            normalized[operation] =
                value;

            continue;
        }


        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {

            normalized[operation] = {
                ...value
            };

            continue;
        }


        throw new Error(
            `Invalid operation configuration for '${operation}'`
        );
    }


    /*
     * Preserve additional custom operations.
     *
     * This is critical for a global dynamic platform.
     *
     * Example:
     *
     * wallet.credit
     * notification.send
     * withdrawal.approve
     *
     * The Resource Manager must not destroy them.
     */

    for (
        const [name, value] of
        Object.entries(operations)
    ) {

        if (
            ALLOWED_OPERATIONS.includes(name)
        ) {
            continue;
        }


        if (
            value === true ||
            value === false
        ) {

            normalized[name] =
                value;

            continue;
        }


        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {

            normalized[name] = {
                ...value
            };

            continue;
        }


        throw new Error(
            `Invalid operation configuration for '${name}'`
        );
    }


    return normalized;
}


// ============================================================
// CREATE
// ============================================================

exports.create = async (
    req,
    res
) => {

    try {

        const name =
            String(
                req.body?.name || ""
            ).trim();


        if (!name) {

            return res.status(400).json({

                success: false,

                message:
                    "Resource name is required"

            });
        }


        const existing =
            await Resource.findOne({

                project:
                    req.project._id,

                name

            });


        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "Resource already exists"

            });
        }


        const settings =
            req.body?.settings || {};


        const operations =
            normalizeOperations(
                settings.operations || {}
            );


        const resource =
            await Resource.create({

                project:
                    req.project._id,

                name,

                displayName:
                    req.body?.displayName || "",

                description:
                    req.body?.description || "",

                icon:
                    req.body?.icon || "",

                enabled:
                    req.body?.enabled !== false,

                settings: {

                    ...settings,

                    operations

                }

            });


        return res.status(201).json({

            success: true,

            message:
                "Resource created",

            data:
                resource

        });

    } catch (error) {

        console.error(
            "CREATE RESOURCE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};


// ============================================================
// LIST
// ============================================================

exports.list = async (
    req,
    res
) => {

    try {

        const resources =
            await Resource.find({

                project:
                    req.project._id

            }).sort({

                createdAt: -1

            });


        return res.json({

            success: true,

            data:
                resources

        });

    } catch (error) {

        console.error(
            "LIST RESOURCES ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};


// ============================================================
// GET ONE
// ============================================================

exports.getOne = async (
    req,
    res
) => {

    try {

        const resource =
            await Resource.findOne({

                _id:
                    req.params.id,

                project:
                    req.project._id

            });


        if (!resource) {

            return res.status(404).json({

                success: false,

                message:
                    "Resource not found"

            });
        }


        return res.json({

            success: true,

            data:
                resource

        });

    } catch (error) {

        console.error(
            "GET RESOURCE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};


// ============================================================
// UPDATE
// ============================================================

exports.update = async (
    req,
    res
) => {

    try {

        const resource =
            await Resource.findOne({

                _id:
                    req.params.id,

                project:
                    req.project._id

            });


        if (!resource) {

            return res.status(404).json({

                success: false,

                message:
                    "Resource not found"

            });
        }


        if (
            req.body.name !== undefined
        ) {

            const name =
                String(
                    req.body.name
                ).trim();


            if (!name) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Resource name cannot be empty"

                });
            }


            const duplicate =
                await Resource.findOne({

                    project:
                        req.project._id,

                    name,

                    _id: {
                        $ne:
                            resource._id
                    }

                });


            if (duplicate) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Resource already exists"

                });
            }


            resource.name =
                name;
        }


        if (
            req.body.displayName !== undefined
        ) {

            resource.displayName =
                req.body.displayName;
        }


        if (
            req.body.description !== undefined
        ) {

            resource.description =
                req.body.description;
        }


        if (
            req.body.icon !== undefined
        ) {

            resource.icon =
                req.body.icon;
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
                        "Resource enabled must be a boolean"

                });
            }


            resource.enabled =
                req.body.enabled;
        }


        if (
            req.body.settings !== undefined
        ) {

            const incomingSettings =
                req.body.settings || {};


            const currentSettings =
                resource.settings &&
                typeof resource.settings === "object"
                    ? resource.settings
                    : {};


            const incomingOperations =
                incomingSettings.operations !== undefined
                    ? incomingSettings.operations
                    : currentSettings.operations || {};


            const normalizedOperations =
                normalizeOperations(
                    incomingOperations
                );


            resource.settings = {

                ...currentSettings,

                ...incomingSettings,

                operations:
                    normalizedOperations

            };
        }


        await resource.save();


        return res.json({

            success: true,

            message:
                "Resource updated",

            data:
                resource

        });

    } catch (error) {

        console.error(
            "UPDATE RESOURCE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};


// ============================================================
// DELETE
// ============================================================

exports.remove = async (
    req,
    res
) => {

    try {

        const resource =
            await Resource.findOneAndDelete({

                _id:
                    req.params.id,

                project:
                    req.project._id

            });


        if (!resource) {

            return res.status(404).json({

                success: false,

                message:
                    "Resource not found"

            });
        }


        return res.json({

            success: true,

            message:
                "Resource deleted"

        });

    } catch (error) {

        console.error(
            "DELETE RESOURCE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message

        });
    }
};


// ============================================================
// EXPORT HELPERS
// ============================================================

exports.ALLOWED_OPERATIONS =
    ALLOWED_OPERATIONS;

exports.normalizeOperations =
    normalizeOperations;
