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
// 1. resourceData
//    Uses the platform's generic ResourceData collection.
//
// 2. mongoose
//    Uses the actual Mongoose model configured by:
//        settings.model
//
// Example:
//
// {
//     "provider": "mongoose",
//     "model": "User"
// }
//
// This allows the Universal Action Engine to operate on
// real application models without hard-coding model-specific
// behavior into the Action Engine.
//
// ============================================================


// ============================================================
// RESOURCE DEFINITION
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
// RESOLVE MONGOOSE MODEL
// ============================================================

function getMongooseModel(resourceDocument) {
    const settings =
        resourceDocument?.settings || {};

    const modelName =
        settings.model;

    if (!modelName) {
        throw new Error(
            `Mongoose resource '${resourceDocument.name}' does not define settings.model`
        );
    }

    /*
     * Only allow normal Mongoose model names.
     *
     * This prevents database configuration from becoming
     * an arbitrary filesystem require path.
     */

    if (
        typeof modelName !== "string" ||
        !/^[A-Za-z][A-Za-z0-9_]*$/.test(modelName)
    ) {
        throw new Error(
            `Invalid Mongoose model name '${modelName}'`
        );
    }

    /*
     * Prefer an already registered Mongoose model.
     */

    try {
        return mongoose.model(modelName);
    } catch (error) {
        /*
         * The model may not have been registered yet.
         *
         * Load it from the platform models directory.
         */

        try {
            return require(`../models/${modelName}`);
        } catch (loadError) {
            throw new Error(
                `Mongoose model '${modelName}' could not be loaded`
            );
        }
    }
}


// ============================================================
// PROVIDER
// ============================================================

function getProvider(resourceDocument) {
    return (
        resourceDocument?.settings?.provider ||
        "resourceData"
    );
}


// ============================================================
// PROJECT FILTER
// ============================================================
//
// Project isolation remains mandatory.
//
// For Mongoose resources, we add project to the query when
// the resource uses a project field.
//
// Most platform resources, including User, contain:
//
//     project: ObjectId
//
// ============================================================

function buildMongooseFilter({
    projectId,
    id = null,
    filter = {}
}) {
    const query = {
        ...filter
    };

    /*
     * Project isolation.
     *
     * Always restrict by the current project when possible.
     */

    if (
        projectId &&
        query.project === undefined
    ) {
        query.project = projectId;
    }

    if (
        id !== undefined &&
        id !== null &&
        id !== ""
    ) {
        query._id = id;
    }

    return query;
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

    /*
     * No platform schema means no additional ResourceData
     * validation is required.
     *
     * Mongoose itself will still enforce its schema when
     * create/update operations execute.
     */

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

    const provider =
        getProvider(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {
        const Model =
            getMongooseModel(
                resourceDocument
            );

        const recordData = {
            ...data
        };

        /*
         * Preserve project isolation for models that support
         * a project field.
         */

        if (
            recordData.project === undefined &&
            projectId
        ) {
            recordData.project = projectId;
        }

        const record =
            await Model.create(
                recordData
            );

        return {
            success: true,
            data: record
        };
    }


    // --------------------------------------------------------
    // RESOURCE DATA
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

    const provider =
        getProvider(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {
        const Model =
            getMongooseModel(
                resourceDocument
            );

        const queryFilter =
            buildMongooseFilter({
                projectId,
                filter
            });

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
                    Number(
                        options.limit
                    )
                );
        }

        if (options.page) {
            const page =
                Math.max(
                    Number(
                        options.page
                    ),
                    1
                );

            const limit =
                Number(
                    options.limit
                ) || 20;

            query =
                query.skip(
                    (page - 1) *
                    limit
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
    // RESOURCE DATA
    // --------------------------------------------------------

    const query = {
        project: projectId,
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
                Number(
                    options.limit
                )
            );
    }

    if (options.page) {
        const page =
            Math.max(
                Number(
                    options.page
                ),
                1
            );

        const limit =
            Number(
                options.limit
            ) || 20;

        records =
            records.skip(
                (page - 1) *
                limit
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
    id
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

    const provider =
        getProvider(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {
        const Model =
            getMongooseModel(
                resourceDocument
            );

        const query =
            buildMongooseFilter({
                projectId,
                id
            });

        const record =
            await Model.findOne(
                query
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
    // RESOURCE DATA
    // --------------------------------------------------------

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
// UPDATE
// ============================================================

async function update({
    projectId,
    resource,
    id,
    data = {},
    replace = true
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

    const provider =
        getProvider(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {
        const Model =
            getMongooseModel(
                resourceDocument
            );

        /*
         * IMPORTANT:
         *
         * A Mongoose resource represents a real application
         * document.
         *
         * Never replace the entire User document merely because
         * the generic ResourceData service historically used
         * replace=true.
         *
         * Universal actions such as:
         *
         *     user.unsuspend
         *
         * must safely perform:
         *
         *     { $set: { status: "active" } }
         *
         * while preserving username, email, password, project,
         * role, metadata, etc.
         */

        const query =
            buildMongooseFilter({
                projectId,
                id
            });

        const record =
            await Model.findOneAndUpdate(
                query,

                {
                    $set: data
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
    // RESOURCE DATA
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
                            (
                                output,
                                key
                            ) => {
                                output[
                                    `data.${key}`
                                ] =
                                    data[key];

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
// DELETE
// ============================================================

async function remove({
    projectId,
    resource,
    id
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

    const provider =
        getProvider(resourceDocument);


    // --------------------------------------------------------
    // MONGOOSE
    // --------------------------------------------------------

    if (provider === "mongoose") {
        const Model =
            getMongooseModel(
                resourceDocument
            );

        const query =
            buildMongooseFilter({
                projectId,
                id
            });

        const result =
            await Model.deleteOne(
                query
            );

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
    // RESOURCE DATA
    // --------------------------------------------------------

    const result =
        await ResourceData.deleteOne({
            project: projectId,

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

    remove

};
