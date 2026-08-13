const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");

const validate = require("./schemaValidator");


// ============================================================
// GLOBAL RESOURCE SERVICE
// ============================================================
//
// This service provides reusable CRUD operations for dynamic
// resources.
//
// Architecture:
//
// Project
//    ↓
// Resource
//    ↓
// Schema
//    ↓
// ResourceData
//
// It is intentionally independent from Express so it can be
// used by:
//
// - controllers
// - Universal Action Engine
// - rules
// - workflows
// - events
// - automation
// - future plugins
//
// ============================================================



// ============================================================
// FIND RESOURCE DEFINITION
// ============================================================

async function getResource({
    projectId,
    resource
}) {

    if (!projectId) {
        throw new Error("Project ID is required");
    }

    if (!resource) {
        throw new Error("Resource is required");
    }


    const document = await Resource.findOne({

        project: projectId,

        name: resource,

        enabled: true

    });


    if (!document) {

        return null;

    }


    return document;

}



// ============================================================
// GET RESOURCE SCHEMA
// ============================================================

async function getSchema({
    projectId,
    resourceId
}) {

    if (!projectId) {
        throw new Error("Project ID is required");
    }

    if (!resourceId) {
        throw new Error("Resource ID is required");
    }


    return await Schema.findOne({

        project: projectId,

        resource: resourceId

    });

}



// ============================================================
// VALIDATE DATA
// ============================================================

async function validateData({
    projectId,
    resourceId,
    data = {}
}) {

    const schema = await getSchema({

        projectId,

        resourceId

    });


    if (!schema) {

        return {

            valid: true,

            errors: []

        };

    }


    return validate(
        schema,
        data
    );

}



// ============================================================
// CREATE RECORD
// ============================================================

async function create({
    projectId,
    resource,
    data = {},
    metadata = {}
}) {

    const resourceDocument = await getResource({

        projectId,

        resource

    });


    if (!resourceDocument) {

        return {

            success: false,

            message: "Resource not found"

        };

    }


    const validation = await validateData({

        projectId,

        resourceId:
            resourceDocument._id,

        data

    });


    if (!validation.valid) {

        return {

            success: false,

            message: "Validation failed",

            errors:
                validation.errors

        };

    }


    const record = await ResourceData.create({

        project: projectId,

        resource:
            resourceDocument._id,

        data,

        metadata

    });


    return {

        success: true,

        data: record

    };

}



// ============================================================
// FIND RECORDS
// ============================================================

async function find({
    projectId,
    resource,
    filter = {},
    options = {}
}) {

    const resourceDocument = await getResource({

        projectId,

        resource

    });


    if (!resourceDocument) {

        return {

            success: false,

            message: "Resource not found"

        };

    }


    const query = {

        project: projectId,

        resource:
            resourceDocument._id,

        ...filter

    };


    let records =
        ResourceData.find(query);


    if (options.sort) {

        records =
            records.sort(
                options.sort
            );

    }


    if (options.select) {

        records =
            records.select(
                options.select
            );

    }


    if (options.limit) {

        records =
            records.limit(
                Number(options.limit)
            );

    }


    if (options.page) {

        const page =
            Math.max(
                Number(options.page),
                1
            );

        const limit =
            Number(options.limit) || 20;


        records =
            records.skip(
                (page - 1) * limit
            );

    }


    records =
        await records;


    return {

        success: true,

        data: records

    };

}



// ============================================================
// FIND ONE RECORD
// ============================================================

async function findOne({
    projectId,
    resource,
    id
}) {

    const resourceDocument = await getResource({

        projectId,

        resource

    });


    if (!resourceDocument) {

        return {

            success: false,

            message: "Resource not found"

        };

    }


    const record =
        await ResourceData.findOne({

            project: projectId,

            resource:
                resourceDocument._id,

            _id: id

        });


    if (!record) {

        return {

            success: false,

            message: "Record not found"

        };

    }


    return {

        success: true,

        data: record

    };

}



// ============================================================
// UPDATE RECORD
// ============================================================

async function update({
    projectId,
    resource,
    id,
    data = {},
    replace = true
}) {

    const resourceDocument = await getResource({

        projectId,

        resource

    });


    if (!resourceDocument) {

        return {

            success: false,

            message: "Resource not found"

        };

    }


    const validation = await validateData({

        projectId,

        resourceId:
            resourceDocument._id,

        data

    });


    if (!validation.valid) {

        return {

            success: false,

            message: "Validation failed",

            errors:
                validation.errors

        };

    }


    const updateOperation =
        replace

            ? {
                data
            }

            : {
                $set: Object.keys(data).reduce(
                    (output, key) => {

                        output[`data.${key}`] =
                            data[key];

                        return output;

                    },
                    {}
                )
            };


    const record =
        await ResourceData.findOneAndUpdate(

            {

                project: projectId,

                resource:
                    resourceDocument._id,

                _id: id

            },

            updateOperation,

            {

                new: true,

                runValidators: true

            }

        );


    if (!record) {

        return {

            success: false,

            message: "Record not found"

        };

    }


    return {

        success: true,

        data: record

    };

}



// ============================================================
// DELETE RECORD
// ============================================================

async function remove({
    projectId,
    resource,
    id
}) {

    const resourceDocument = await getResource({

        projectId,

        resource

    });


    if (!resourceDocument) {

        return {

            success: false,

            message: "Resource not found"

        };

    }


    const result =
        await ResourceData.deleteOne({

            project: projectId,

            resource:
                resourceDocument._id,

            _id: id

        });


    if (
        result.deletedCount === 0
    ) {

        return {

            success: false,

            message: "Record not found"

        };

    }


    return {

        success: true,

        deleted: true

    };

}



// ============================================================
// EXPORT
// ============================================================

module.exports = {

    getResource,

    getSchema,

    validateData,

    create,

    find,

    findOne,

    update,

    remove

};
