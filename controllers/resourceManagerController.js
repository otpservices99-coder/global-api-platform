const Resource = require("../models/Resource");


// ============================================================
// ALLOWED GENERIC OPERATIONS
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
// NORMALIZE OPERATION SETTINGS
// ============================================================

function normalizeOperations(operations = {}) {

    const normalized = {};

    for (const operation of ALLOWED_OPERATIONS) {

        if (
            Object.prototype.hasOwnProperty.call(
                operations,
                operation
            )
        ) {

            normalized[operation] =
                operations[operation] === true;

        } else {

            normalized[operation] = true;

        }

    }

    return normalized;
}


// ============================================================
// CREATE RESOURCE
// ============================================================

exports.create = async (req, res) => {

    try {

        const name =
            String(
                req.body.name || ""
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

            return res.status(400).json({

                success: false,

                message:
                    "Resource already exists"

            });

        }


        const settings =
            req.body.settings || {};


        const resource =
            await Resource.create({

                project:
                    req.project._id,

                name,

                displayName:
                    req.body.displayName || "",

                description:
                    req.body.description || "",

                icon:
                    req.body.icon || "",

                enabled:
                    req.body.enabled !== false,

                settings: {

                    ...settings,

                    operations:
                        normalizeOperations(
                            settings.operations || {}
                        )

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

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ============================================================
// LIST RESOURCES
// ============================================================

exports.list = async (req, res) => {

    try {

        const resources =
            await Resource.find({

                project:
                    req.project._id

            })
            .sort({
                createdAt: -1
            });


        return res.json({

            success: true,

            data:
                resources

        });


    } catch (error) {

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ============================================================
// GET SINGLE RESOURCE
// ============================================================

exports.getOne = async (req, res) => {

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

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ============================================================
// UPDATE RESOURCE
// ============================================================

exports.update = async (req, res) => {

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

                return res.status(400).json({

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

            resource.enabled =
                req.body.enabled === true;

        }


        if (
            req.body.settings !== undefined
        ) {

            const incomingSettings =
                req.body.settings || {};


            resource.settings = {

                ...resource.settings?.toObject?.(),
                ...resource.settings,
                ...incomingSettings,

                operations:
                    normalizeOperations(
                        incomingSettings.operations ??
                        resource.settings?.operations ??
                        {}
                    )

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

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};


// ============================================================
// DELETE RESOURCE
// ============================================================

exports.remove = async (req, res) => {

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
