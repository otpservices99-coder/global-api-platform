const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");

const validate = require("../services/schemaValidator");
const {
    buildQuery,
    buildOptions
} = require("../services/queryEngine");


// ============================================================
// LIST RESOURCES
// GET /api/v1/resources
// ============================================================

exports.listResources = async (req, res) => {
    try {

        const resources = await Resource.find({
            project: req.project._id
        })
        .sort({
            createdAt: -1
        })
        .lean();

        return res.json({
            success: true,
            data: resources
        });

    } catch (error) {

        console.error(
            "Resource list error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// GET RESOURCE SCHEMA
// GET /api/v1/resources/:resource/schema
// ============================================================

exports.getSchema = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource
        }).lean();

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const schema = await Schema.findOne({
            project: req.project._id,
            resource: resource._id
        }).lean();

        return res.json({
            success: true,
            data: schema || null
        });

    } catch (error) {

        console.error(
            "Resource schema error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// CREATE RECORD
// POST /api/v1/resources/:resource
// ============================================================

exports.create = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource,
            enabled: true
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const schema = await Schema.findOne({
            project: req.project._id,
            resource: resource._id
        });

        if (schema) {

            const validation = validate(
                schema,
                req.body
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    errors: validation.errors
                });
            }
        }

        const record = await ResourceData.create({
            project: req.project._id,
            resource: resource._id,
            data: req.body
        });

        return res.status(201).json({
            success: true,
            data: record
        });

    } catch (error) {

        console.error(
            "Resource create error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// GET RECORDS
// GET /api/v1/resources/:resource
// ============================================================

exports.find = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const query = buildQuery(
            req.query
        );

        query.project = req.project._id;
        query.resource = resource._id;

        const options = buildOptions(
            req.query
        );

        let records = ResourceData.find(
            query
        );

        if (options.sort) {
            records = records.sort(
                options.sort
            );
        }

        if (options.select) {
            records = records.select(
                options.select
            );
        }

        if (options.limit) {
            records = records.limit(
                options.limit
            );
        }

        if (options.page) {
            records = records.skip(
                (options.page - 1) *
                (options.limit || 20)
            );
        }

        records = await records;

        return res.json({
            success: true,
            data: records
        });

    } catch (error) {

        console.error(
            "Resource find error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// GET SINGLE RECORD
// GET /api/v1/resources/:resource/:id
// ============================================================

exports.findOne = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const record = await ResourceData.findOne({
            project: req.project._id,
            resource: resource._id,
            _id: req.params.id
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }

        return res.json({
            success: true,
            data: record
        });

    } catch (error) {

        console.error(
            "Resource findOne error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// UPDATE RECORD
// PATCH /api/v1/resources/:resource/:id
// ============================================================

exports.update = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const record =
            await ResourceData.findOneAndUpdate(
                {
                    project: req.project._id,
                    resource: resource._id,
                    _id: req.params.id
                },
                {
                    data: req.body
                },
                {
                    new: true
                }
            );

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }

        return res.json({
            success: true,
            data: record
        });

    } catch (error) {

        console.error(
            "Resource update error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ============================================================
// DELETE RECORD
// DELETE /api/v1/resources/:resource/:id
// ============================================================

exports.remove = async (req, res) => {
    try {

        const resource = await Resource.findOne({
            project: req.project._id,
            name: req.params.resource
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const result =
            await ResourceData.deleteOne({
                project: req.project._id,
                resource: resource._id,
                _id: req.params.id
            });

        if (!result.deletedCount) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }

        return res.json({
            success: true,
            message: "Deleted"
        });

    } catch (error) {

        console.error(
            "Resource delete error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};
