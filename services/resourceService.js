const mongoose = require("mongoose");
const path = require("path");

const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");
const validate = require("./schemaValidator");


// ============================================================
// GLOBAL RESOURCE SERVICE
// ============================================================
//
// Generic resource abstraction.
//
// Providers:
//   mongoose
//   mongo
//   mongodb
//   resourceData
//
// Mongoose resources are resolved dynamically from:
//
//   Resource.settings.model
//
// Example:
//
// {
//     provider: "mongoose",
//     model: "Wallet"
// }
//
// The service automatically loads the corresponding model when
// it has not already been registered with Mongoose.
//
// No project-specific resource names are hard-coded here.
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

    const document =
        await Resource.findOne({
            project: projectId,
            name: resource,
            enabled: true
        });

    return document || null;
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
// DYNAMIC MONGOOSE MODEL LOADER
// ============================================================
//
// IMPORTANT:
//
// mongoose.model("Wallet") only works if Wallet.js has already
// been required somewhere.
//
// The universal resource engine cannot depend on server.js
// happening to load every possible model first.
//
// Therefore:
//
// 1. Check existing Mongoose registry.
// 2. If missing, dynamically load ../models/<modelName>.js.
// 3. Check registry again.
// 4. Return the model.
//
// This remains completely generic.
// ============================================================

function getMongooseModel(resourceDocument) {

    const modelName =
        resourceDocument?.settings?.model;

    if (!modelName) {

        throw new Error(
            `Mongoose resource '${resourceDocument?.name || "unknown"}' has no model configured`
        );

    }


    // --------------------------------------------------------
    // 1. Already registered
    // --------------------------------------------------------

    if (
        mongoose.models &&
        mongoose.models[modelName]
    ) {

        return mongoose.models[modelName];

    }


    // --------------------------------------------------------
    // 2. Dynamically load model
    // --------------------------------------------------------

    const modelPath =
        path.join(
            __dirname,
            "..",
            "models",
            `${modelName}.js`
        );


    try {

        require(modelPath);

    } catch (error) {

        throw new Error(
            `Unable to load Mongoose model '${modelName}': ${error.message}`
        );

    }


    // --------------------------------------------------------
    // 3. Verify registration
    // --------------------------------------------------------

    if (
        mongoose.models &&
        mongoose.models[modelName]
    ) {

        return mongoose.models[modelName];

    }


    throw new Error(
        `Mongoose model '${modelName}' is not registered`
    );

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
                getMongooseModel(
                    resourceDocument
                )

        };

    }


    return {

        provider: "resourceData",

        Model:
            ResourceData

    };

}


// ============================================================
// SCHEMA
// ============================================================

async function getSchema({
    projectId,
    resourceId
}) {

    if (!projectId) {

        throw new Error(
            "Project ID is required"
        );

    }

    if (!resourceId) {

        return null;

    }

    const schema =
        await Schema.findOne({

            project:
                projectId,

            resource:
                resourceId,

            enabled:
                true

        });

    return schema || null;

}


// ============================================================
// PROJECT FILTER
// ============================================================
//
// If the underlying Mongoose model contains a project field,
// automatically scope all operations to the current project.
//
// This prevents cross-project access while remaining generic.
// ============================================================

function buildProjectFilter(
    Model,
    projectId
) {

    if (
        Model?.schema?.path("project")
    ) {

        return {

            project:
                projectId

        };

    }

    return {};

}


// ============================================================
// PREPARE CREATE DATA
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
// VALIDATE DATA
// ============================================================

async function validateResourceData({
    projectId,
    resourceDocument,
    data
}) {

    const schema =
        await getSchema({

            projectId,

            resourceId:
                resourceDocument?._id

        });


    if (!schema) {

        return {

            success: true,

            data

        };

    }


    try {

        const result =
            await validate(
                schema,
                data
            );


        if (
            result === false
        ) {

            return {

                success: false,

                message:
                    "Resource validation failed"

            };

        }


        if (
            result &&
            typeof result === "object" &&
            result.success === false
        ) {

            return result;

        }


        return {

            success: true,

            data

        };

    } catch (error) {

        return {

            success: false,

            message:
                error.message ||
                "Resource validation failed"

        };

    }

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

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

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

            message:
                "Resource not found"

        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(
            resourceDocument
        );


    const preparedData =
        provider === "mongoose"

            ? prepareCreateData(
                Model,
                projectId,
                data
            )

            : {
                ...data,

                project:
                    projectId
            };


    const validation =
        await validateResourceData({

            projectId,

            resourceDocument,

            data:
                preparedData

        });


    if (
        !validation.success
    ) {

        return validation;

    }


    if (
        provider === "mongoose"
    ) {

        const record =
            await Model.create(
                preparedData
            );


        return {

            success: true,

            data:
                record

        };

    }


    const record =
        await ResourceData.create({

            project:
                projectId,

            resource:
                resourceDocument._id,

            data:
                preparedData,

            metadata:
                metadata || {}

        });


    return {

        success: true,

        data:
            record

    };

}


// ============================================================
// FIND
// ============================================================

async function find({
    projectId,
    resource,
    filter = {},
    options = {}
}) {

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

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

            message:
                "Resource not found"

        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(
            resourceDocument
        );


    const safeFilter =
        (
            filter &&
            typeof filter === "object" &&
            !Array.isArray(filter)
        )
            ? {
                ...filter
            }
            : {};


    if (
        provider === "mongoose"
    ) {

        const queryFilter = {

            ...buildProjectFilter(
                Model,
                projectId
            ),

            ...safeFilter

        };


        let query =
            Model.find(
                queryFilter
            );


        if (
            options.select
        ) {

            query =
                query.select(
                    options.select
                );

        }


        if (
            options.sort
        ) {

            query =
                query.sort(
                    options.sort
                );

        }


        if (
            options.skip !== undefined
        ) {

            query =
                query.skip(
                    Number(options.skip) || 0
                );

        }


        if (
            options.limit !== undefined
        ) {

            query =
                query.limit(
                    Number(options.limit) || 0
                );

        }


        const records =
            await query;


        return {

            success: true,

            data:
                records

        };

    }


    const records =
        await ResourceData.find({

            project:
                projectId,

            resource:
                resourceDocument._id,

            ...safeFilter

        });


    return {

        success: true,

        data:
            records

    };

}


// ============================================================
// FIND ONE
// ============================================================
//
// Supports BOTH:
//
//   id
//
// and:
//
//   filter
//
// Example:
//
// findOne({
//     projectId,
//     resource: "wallet",
//     filter: {
//         user: userId
//     }
// })
//
// This is what wallet.view uses.
//
// IMPORTANT:
// The filter is NOT discarded when id is absent.
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

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

        };

    }


    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";


    const hasFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter) &&
        Object.keys(filter).length > 0;


    if (
        !hasId &&
        !hasFilter
    ) {

        return {

            success: false,

            message:
                "Record ID or filter is required"

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

            message:
                "Resource not found"

        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(
            resourceDocument
        );


    /*
     * ID has priority.
     *
     * Otherwise use the supplied filter.
     */

    const lookup =
        hasId

            ? {
                _id:
                    id
            }

            : {
                ...filter
            };


    if (
        provider === "mongoose"
    ) {

        const projectFilter =
            buildProjectFilter(
                Model,
                projectId
            );


        /*
         * Project scope and lookup are deliberately combined.
         *
         * Example generated query:
         *
         * {
         *     project: projectId,
         *     user: userId
         * }
         */

        const query = {

            ...projectFilter,

            ...lookup

        };


        let mongooseQuery =
            Model.findOne(
                query
            );


        const record =
            await mongooseQuery;


        if (!record) {

            return {

                success: false,

                message:
                    "Record not found"

            };

        }


        return {

            success: true,

            data:
                record

        };

    }


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

            message:
                "Record not found"

        };

    }


    return {

        success: true,

        data:
            record

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
    filter = {},
    replace = false
}) {

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

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

            message:
                "Resource not found"

        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(
            resourceDocument
        );


    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";


    const hasFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter) &&
        Object.keys(filter).length > 0;


    if (
        !hasId &&
        !hasFilter
    ) {

        return {

            success: false,

            message:
                "Record ID or filter is required"

        };

    }


    const lookup =
        hasId

            ? {
                _id:
                    id
            }

            : {
                ...filter
            };


    const validation =
        await validateResourceData({

            projectId,

            resourceDocument,

            data

        });


    if (
        !validation.success
    ) {

        return validation;

    }


    if (
        provider === "mongoose"
    ) {

        const query = {

            ...buildProjectFilter(
                Model,
                projectId
            ),

            ...lookup

        };


        const updateData =
            replace

                ? data

                : {
                    $set:
                        data
                };


        const record =
            await Model.findOneAndUpdate(

                query,

                updateData,

                {
                    new: true,

                    runValidators:
                        true

                }

            );


        if (!record) {

            return {

                success: false,

                message:
                    "Record not found"

            };

        }


        return {

            success: true,

            data:
                record

        };

    }


    const record =
        await ResourceData.findOneAndUpdate(

            {

                project:
                    projectId,

                resource:
                    resourceDocument._id,

                ...lookup

            },

            replace
                ? {
                    data
                }
                : {
                    $set: {
                        data
                    }
                },

            {
                new: true
            }

        );


    if (!record) {

        return {

            success: false,

            message:
                "Record not found"

        };

    }


    return {

        success: true,

        data:
            record

    };

}


// ============================================================
// DELETE
// ============================================================

async function remove({
    projectId,
    resource,
    id,
    filter = {}
}) {

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

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

            message:
                "Resource not found"

        };

    }


    const {
        provider,
        Model
    } =
        resolveModel(
            resourceDocument
        );


    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";


    const hasFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter) &&
        Object.keys(filter).length > 0;


    if (
        !hasId &&
        !hasFilter
    ) {

        return {

            success: false,

            message:
                "Record ID or filter is required"

        };

    }


    const lookup =
        hasId

            ? {
                _id:
                    id
            }

            : {
                ...filter
            };


    if (
        provider === "mongoose"
    ) {

        const record =
            await Model.findOneAndDelete({

                ...buildProjectFilter(
                    Model,
                    projectId
                ),

                ...lookup

            });


        if (!record) {

            return {

                success: false,

                message:
                    "Record not found"

            };

        }


        return {

            success: true,

            data:
                record

        };

    }


    const record =
        await ResourceData.findOneAndDelete({

            project:
                projectId,

            resource:
                resourceDocument._id,

            ...lookup

        });


    if (!record) {

        return {

            success: false,

            message:
                "Record not found"

        };

    }


    return {

        success: true,

        data:
            record

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
    amount = 1,
    filter = {}
}) {

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

        };

    }


    if (!field) {

        return {

            success: false,

            message:
                "Increment field is required"

        };

    }


    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        )
    ) {

        return {

            success: false,

            message:
                "Invalid increment amount"

        };

    }


    const existing =
        await findOne({

            projectId,

            resource,

            id,

            filter

        });


    if (
        !existing.success
    ) {

        return existing;

    }


    const current =
        Number(
            existing.data?.[field] ?? 0
        );


    return update({

        projectId,

        resource,

        id:
            existing.data?._id,

        data: {

            [field]:
                current +
                numericAmount

        },

        replace:
            false

    });

}


// ============================================================
// DECREMENT
// ============================================================

async function decrement({
    projectId,
    resource,
    id,
    field,
    amount = 1,
    filter = {}
}) {

    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    if (!resource) {

        return {

            success: false,

            message:
                "Resource is required"

        };

    }


    if (!field) {

        return {

            success: false,

            message:
                "Decrement field is required"

        };

    }


    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        )
    ) {

        return {

            success: false,

            message:
                "Invalid decrement amount"

        };

    }


    const existing =
        await findOne({

            projectId,

            resource,

            id,

            filter

        });


    if (
        !existing.success
    ) {

        return existing;

    }


    const current =
        Number(
            existing.data?.[field] ?? 0
        );


    return update({

        projectId,

        resource,

        id:
            existing.data?._id,

        data: {

            [field]:
                current -
                numericAmount

        },

        replace:
            false

    });

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    getResource,

    getProvider,

    getMongooseModel,

    resolveModel,

    getSchema,

    buildProjectFilter,

    prepareCreateData,

    validateResourceData,

    create,

    find,

    findOne,

    update,

    remove,

    delete: remove,

    increment,

    decrement

};
