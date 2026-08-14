const mongoose = require("mongoose");

const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");
const validate = require("./schemaValidator");


// ============================================================
// GLOBAL RESOURCE SERVICE
// ============================================================
//
// Supports two resource providers:
//
// 1. mongoose
//    Resource.settings.model -> actual Mongoose model
//
// 2. resourceData
//    Existing generic ResourceData storage
//
// The provider/model is determined by the Resource document.
// No Earnify-specific resource names are hard-coded here.
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

    const document =
        await Resource.findOne({
            project: projectId,
            name: resource,
            enabled: true
        });

    return document || null;
}


// ============================================================
// RESOLVE RESOURCE PROVIDER
// ============================================================

function getProvider(resourceDocument) {

    return (
        resourceDocument?.settings?.provider ||
        "resourceData"
    );
}


// ============================================================
// RESOLVE MONGOOSE MODEL
// ============================================================

function getMongooseModel(resourceDocument) {

    const modelName =
        resourceDocument?.settings?.model;

    if (!modelName) {

        throw new Error(
            `Mongoose resource '${resourceDocument?.name || "unknown"}' has no model configured`
        );

    }

    let Model;

    try {

        Model =
            mongoose.model(modelName);

    } catch (error) {

        throw new Error(
            `Mongoose model '${modelName}' is not registered`
        );

    }

    return Model;
}


// ============================================================
// RESOLVE STORAGE MODEL
// ============================================================

function resolveModel(resourceDocument) {

    const provider =
        getProvider(resourceDocument);

    if (
        provider === "mongoose" ||
        provider === "mongo" ||
        provider === "mongodb"
    ) {

        return {
            provider: "mongoose",
            Model:
                getMongooseModel(resourceDocument)
        };

    }

    return {
        provider: "resourceData",
        Model:
            ResourceData
    };
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

    const schema =
        await getSchema({
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
// PROJECT FILTER
// ============================================================
//
// Mongoose resources are project-scoped when their model
// contains a "project" field.
//
// This keeps the service generic without knowing anything
// about User, Wallet, Withdrawal, etc.
// ============================================================

function buildProjectFilter(
    Model,
    projectId
) {

    if (
        Model?.schema?.path("project")
    ) {

        return {
            project: projectId
        };

    }

    return {};
}


// ============================================================
// PREPARE MONGOOSE CREATE DATA
// ============================================================

function prepareCreateData(
    Model,
    projectId,
    data = {}
) {

    const output = {
        ...data
    };

    if (
        Model?.schema?.path("project") &&
        output.project == null
    ) {

        output.project =
            projectId;

    }

    return output;
}


// ============================================================
// CREATE
// ============================================================

async function create({
    projectId,
    resource,
    data = {},
    metadata = {}
}) {

    const resourceDocument =
        await getResource({
            projectId,
            resource
        });

    if (!resourceDocument) {

        return {
            success: false,
            message: "Resource not found"
        };

    }

    const {
        provider,
        Model
    } =
        resolveModel(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {

        const createData =
            prepareCreateData(
                Model,
                projectId,
                data
            );

        const record =
            await Model.create(
                createData
            );

        return {
            success: true,
            data: record
        };

    }


    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const validation =
        await validateData({
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

    const record =
        await ResourceData.create({

            project:
                projectId,

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

    const resourceDocument =
        await getResource({
            projectId,
            resource
        });

    if (!resourceDocument) {

        return {
            success: false,
            message: "Resource not found"
        };

    }

    const {
        provider,
        Model
    } =
        resolveModel(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {

        const queryFilter = {

            ...buildProjectFilter(
                Model,
                projectId
            ),

            ...filter

        };

        let query =
            Model.find(
                queryFilter
            );


        if (options.sort) {

            query =
                query.sort(
                    options.sort
                );

        }


        if (options.select) {

            query =
                query.select(
                    options.select
                );

        }


        if (options.limit) {

            query =
                query.limit(
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

            query =
                query.skip(
                    (page - 1) * limit
                );

        }


        const records =
            await query;

        return {
            success: true,
            data: records
        };

    }


    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const query = {

        project:
            projectId,

        resource:
            resourceDocument._id,

        ...filter

    };


    let records =
        ResourceData.find(
            query
        );


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
// FIND ONE
// ============================================================

async function findOne({
    projectId,
    resource,
    id = null,
    filter = {}
}) {

    if (!projectId) {
        return {
            success: false,
            message: "Project ID is required"
        };
    }

    if (!resource) {
        return {
            success: false,
            message: "Resource is required"
        };
    }

    if (
        !id &&
        (
            !filter ||
            typeof filter !== "object" ||
            Array.isArray(filter) ||
            Object.keys(filter).length === 0
        )
    ) {
        return {
            success: false,
            message: "Record ID or filter is required"
        };
    }

    const resourceDocument =
        await getResource({
            projectId,
            resource
        });

    if (!resourceDocument) {
        return {
            success: false,
            message: "Resource not found"
        };
    }

    const {
        provider,
        Model
    } = resolveModel(resourceDocument);

    // ========================================================
    // BUILD LOOKUP
    // ========================================================

    let lookup = {};

    if (id) {
        lookup._id = id;
    } else {
        lookup = {
            ...filter
        };
    }

    // ========================================================
    // MONGOOSE
    // ========================================================

    if (provider === "mongoose") {

        const record =
            await Model.findOne({
                ...buildProjectFilter(
                    Model,
                    projectId
                ),
                ...lookup
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

    // ========================================================
    // RESOURCEDATA
    // ========================================================

    const record =
        await ResourceData.findOne({
            project:
                projectId,

            resource:
                resourceDocument._id,

            ...lookup
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

    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const record =
        await ResourceData.findOne({

            project:
                projectId,

            resource:
                resourceDocument._id,

            _id:
                id

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
// UPDATE
// ============================================================

async function update({
    projectId,
    resource,
    id,
    data = {},
    replace = true
}) {

    if (!id) {

        return {
            success: false,
            message: "Record ID is required"
        };

    }

    const resourceDocument =
        await getResource({
            projectId,
            resource
        });

    if (!resourceDocument) {

        return {
            success: false,
            message: "Resource not found"
        };

    }

    const {
        provider,
        Model
    } =
        resolveModel(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {

        const filter = {

            ...buildProjectFilter(
                Model,
                projectId
            ),

            _id: id

        };


        let updateOperation;


        if (replace) {

            updateOperation = {
                $set: data
            };

        } else {

            updateOperation = {
                $set: data
            };

        }


        const record =
            await Model.findOneAndUpdate(

                filter,

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


    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const validation =
        await validateData({

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
                $set:
                    Object.keys(data)
                        .reduce(
                            (output, key) => {

                                output[
                                    `data.${key}`
                                ] = data[key];

                                return output;

                            },
                            {}
                        )
            };


    const record =
        await ResourceData.findOneAndUpdate(

            {

                project:
                    projectId,

                resource:
                    resourceDocument._id,

                _id:
                    id

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
// INCREMENT
// ============================================================

async function increment({
    projectId,
    resource,
    id,
    field,
    amount = 1
}) {

    if (!id) {

        return {
            success: false,
            message: "Record ID is required"
        };

    }

    if (!field) {

        return {
            success: false,
            message: "Increment field is required"
        };

    }

    const numericAmount =
        Number(amount);


    if (!Number.isFinite(numericAmount)) {

        return {
            success: false,
            message: "Invalid increment amount"
        };

    }


    const resourceDocument =
        await getResource({
            projectId,
            resource
        });


    if (!resourceDocument) {

        return {
            success: false,
            message: "Resource not found"
        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {

        const record =
            await Model.findOneAndUpdate(

                {
                    ...buildProjectFilter(
                        Model,
                        projectId
                    ),

                    _id: id
                },

                {
                    $inc: {
                        [field]:
                            numericAmount
                    }
                },

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


    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const record =
        await ResourceData.findOne({

            project:
                projectId,

            resource:
                resourceDocument._id,

            _id:
                id

        });


    if (!record) {

        return {
            success: false,
            message: "Record not found"
        };

    }


    const current =
        Number(
            record.data?.[field] ?? 0
        );


    record.data[field] =
        current + numericAmount;


    await record.save();


    return {
        success: true,
        data: record
    };
}


// ============================================================
// DECREMENT
// ============================================================

async function decrement({
    projectId,
    resource,
    id,
    field,
    amount = 1
}) {

    const numericAmount =
        Number(amount);


    if (!Number.isFinite(numericAmount)) {

        return {
            success: false,
            message: "Invalid decrement amount"
        };

    }


    return increment({

        projectId,

        resource,

        id,

        field,

        amount:
            -Math.abs(
                numericAmount
            )

    });
}


// ============================================================
// DELETE
// ============================================================

async function remove({
    projectId,
    resource,
    id
}) {

    if (!id) {

        return {
            success: false,
            message: "Record ID is required"
        };

    }


    const resourceDocument =
        await getResource({
            projectId,
            resource
        });


    if (!resourceDocument) {

        return {
            success: false,
            message: "Resource not found"
        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {

        const result =
            await Model.deleteOne({

                ...buildProjectFilter(
                    Model,
                    projectId
                ),

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


    // --------------------------------------------------------
    // RESOURCEDATA
    // --------------------------------------------------------

    const result =
        await ResourceData.deleteOne({

            project:
                projectId,

            resource:
                resourceDocument._id,

            _id:
                id

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

    increment,

    decrement,

    remove

};
