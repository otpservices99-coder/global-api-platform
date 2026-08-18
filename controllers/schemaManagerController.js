const Schema = require("../models/Schema");
const Resource = require("../models/Resource");


// ============================================================
// NORMALIZE FIELDS
// ============================================================

function normalizeFields(fields) {

    if (!Array.isArray(fields)) {
        return [];
    }

    return fields
        .filter(field => field && field.name)
        .map(field => ({
            name: String(field.name).trim(),
            type: String(field.type || "string").trim(),
            required: field.required === true,
            defaultValue:
                field.defaultValue !== undefined
                    ? field.defaultValue
                    : null,
            options:
                Array.isArray(field.options)
                    ? field.options
                    : []
        }));
}


// ============================================================
// RESOLVE RESOURCE
// ============================================================

async function resolveResource(req, value) {

    if (!value) {
        return null;
    }

    // Accept Resource ObjectId
    if (
        typeof value === "string" &&
        /^[a-fA-F0-9]{24}$/.test(value)
    ) {
        const byId = await Resource.findOne({
            _id: value,
            project: req.project._id
        });

        if (byId) {
            return byId;
        }
    }

    // Accept resource name
    return Resource.findOne({
        project: req.project._id,
        name: String(value).trim()
    });
}


// ============================================================
// CREATE
// ============================================================

exports.create = async (req, res) => {

    try {

        const resource =
            await resolveResource(
                req,
                req.body.resource
            );

        if (!resource) {

            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const existing =
            await Schema.findOne({
                project: req.project._id,
                resource: resource._id
            });

        if (existing) {

            return res.status(400).json({
                success: false,
                message: "Schema already exists"
            });
        }

        const schema =
            await Schema.create({

                project: req.project._id,

                resource: resource._id,

                fields:
                    normalizeFields(
                        req.body.fields
                    )

            });

        await schema.populate("resource");

        return res.status(201).json({

            success: true,

            message: "Schema created",

            data: schema

        });

    } catch (error) {

        console.error(
            "SCHEMA CREATE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });
    }
};


// ============================================================
// LIST
// ============================================================

exports.list = async (req, res) => {

    try {

        const schemas =
            await Schema.find({
                project: req.project._id
            })
            .populate("resource")
            .sort({
                createdAt: -1
            });

        return res.json({

            success: true,

            data: schemas

        });

    } catch (error) {

        console.error(
            "SCHEMA LIST ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });
    }
};


// ============================================================
// GET ONE
// ============================================================

exports.getOne = async (req, res) => {

    try {

        const schema =
            await Schema.findOne({

                _id: req.params.id,

                project: req.project._id

            })
            .populate("resource");

        if (!schema) {

            return res.status(404).json({

                success: false,

                message: "Schema not found"

            });
        }

        return res.json({

            success: true,

            data: schema

        });

    } catch (error) {

        console.error(
            "SCHEMA GET ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });
    }
};


// ============================================================
// UPDATE
// ============================================================

exports.update = async (req, res) => {

    try {

        const schema =
            await Schema.findOne({

                _id: req.params.id,

                project: req.project._id

            });

        if (!schema) {

            return res.status(404).json({

                success: false,

                message: "Schema not found"

            });
        }

        if (
            req.body.resource !== undefined
        ) {

            const resource =
                await resolveResource(
                    req,
                    req.body.resource
                );

            if (!resource) {

                return res.status(404).json({

                    success: false,

                    message: "Resource not found"

                });
            }

            const duplicate =
                await Schema.findOne({

                    project: req.project._id,

                    resource: resource._id,

                    _id: {
                        $ne: schema._id
                    }

                });

            if (duplicate) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A schema already exists for this resource"

                });
            }

            schema.resource =
                resource._id;
        }

        if (
            req.body.fields !== undefined
        ) {

            schema.fields =
                normalizeFields(
                    req.body.fields
                );
        }

        await schema.save();

        await schema.populate("resource");

        return res.json({

            success: true,

            message: "Schema updated",

            data: schema

        });

    } catch (error) {

        console.error(
            "SCHEMA UPDATE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });
    }
};


// ============================================================
// DELETE
// ============================================================

exports.remove = async (req, res) => {

    try {

        const schema =
            await Schema.findOneAndDelete({

                _id: req.params.id,

                project: req.project._id

            });

        if (!schema) {

            return res.status(404).json({

                success: false,

                message: "Schema not found"

            });
        }

        return res.json({

            success: true,

            message: "Schema deleted"

        });

    } catch (error) {

        console.error(
            "SCHEMA DELETE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });
    }
};
