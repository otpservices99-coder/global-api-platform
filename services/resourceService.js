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
// Resource configuration controls operations and behavior.
// This service contains NO project-specific resource mappings.
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
// DYNAMIC MONGOOSE MODEL RESOLVER
// ============================================================

function getMongooseModel(resourceDocument) {
    const modelName =
        resourceDocument?.settings?.model;

    if (
        typeof modelName !== "string" ||
        !modelName.trim()
    ) {
        throw new Error(
            `Mongoose resource '${resourceDocument?.name || "unknown"}' has no valid model configured`
        );
    }

    const normalizedModelName = modelName.trim();

    if (
        !/^[A-Za-z0-9_$-]+$/.test(
            normalizedModelName
        )
    ) {
        throw new Error(
            `Invalid Mongoose model name '${normalizedModelName}'`
        );
    }

    if (
        mongoose.models &&
        mongoose.models[normalizedModelName]
    ) {
        return mongoose.models[normalizedModelName];
    }

    const modelPath = path.join(
        __dirname,
        "..",
        "models",
        `${normalizedModelName}.js`
    );

    try {
        require(modelPath);
    } catch (error) {
        throw new Error(
            `Unable to load configured Mongoose model '${normalizedModelName}': ${error.message}`
        );
    }

    if (
        mongoose.models &&
        mongoose.models[normalizedModelName]
    ) {
        return mongoose.models[normalizedModelName];
    }

    throw new Error(
        `Configured Mongoose model '${normalizedModelName}' did not register with Mongoose`
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
            Model: getMongooseModel(resourceDocument)
        };
    }

    return {
        provider: "resourceData",
        Model: ResourceData
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

    const schema = await Schema.findOne({
        project: projectId,
        resource: resourceId,
        enabled: true
    });

    return schema || null;
}


// ============================================================
// PROJECT FILTER
// ============================================================
//
// If the underlying Mongoose model contains a
// project field, automatically scope all operations
// to the current project.
//
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
// NORMALIZE MONGODB VALUES
// ============================================================
//
// Converts BSON/Mongoose ObjectIds to canonical hex strings
// before passing data into a Mongoose model.
//
// Mongoose will cast those strings back to ObjectId according
// to the target schema.
//
// This keeps ResourceService provider-safe and avoids
// cross-Mongoose/BSON ObjectId representation problems.
// ============================================================

function normalizeMongoValues(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return value;
    }

    if (
        typeof value === "object" &&
        typeof value.toHexString === "function"
    ) {
        return value.toHexString();
    }

    if (
        Array.isArray(value)
    ) {
        return value.map(
            item =>
                normalizeMongoValues(item)
        );
    }

    if (
        typeof value === "object"
    ) {
        const output = {};

        for (
            const [key, item]
            of Object.entries(value)
        ) {
            output[key] =
                normalizeMongoValues(item);
        }

        return output;
    }

    return value;
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
        output.project = projectId;
    }

    return output;
}


// ============================================================
// VALIDATE DATA
// ============================================================


async function validateResourceData({
    projectId,
    resourceDocument,
    data = {}
}) {
    if (!projectId) {
        return {
            success: false,
            message: "Project ID is required"
        };
    }

    if (!resourceDocument) {
        return {
            success: false,
            message: "Resource definition is required"
        };
    }

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        return {
            success: false,
            message: "Data must be an object"
        };
    }

    // ========================================================
    // GLOBAL DYNAMIC VALIDATION
    // ========================================================
    //
    // A resource may operate without a Schema definition.
    // In that case arbitrary fields are accepted.
    //
    // When a Schema exists, only its configured rules are
    // enforced. Unknown fields are NOT rejected.
    //
    // This keeps validation configuration-driven and avoids
    // adding code whenever a new resource/action is created.
    // ========================================================

    let schemaDocument = null;

    try {
        schemaDocument = await getSchema({
            projectId,
            resourceId: resourceDocument._id
        });
    } catch (error) {
        schemaDocument = null;
    }

    const fields =
        Array.isArray(schemaDocument?.fields)
            ? schemaDocument.fields
            : [];

    // No schema = fully dynamic resource.
    if (fields.length === 0) {
        return {
            success: true,
            data
        };
    }

    // Schema exists = enforce configured rules only.
    for (const field of fields) {
        if (!field || !field.name) {
            continue;
        }

        const name = field.name;

        const exists =
            Object.prototype.hasOwnProperty.call(
                data,
                name
            );

        if (
            field.required === true &&
            !exists
        ) {
            return {
                success: false,
                message: name + " is required"
            };
        }

        if (
            exists &&
            Array.isArray(field.options) &&
            field.options.length > 0 &&
            data[name] !== null &&
            data[name] !== undefined &&
            !field.options.includes(
                String(data[name])
            )
        ) {
            return {
                success: false,
                message:
                    name +
                    " must be one of: " +
                    field.options.join(", ")
            };
        }
    }

    return {
        success: true,
        data
    };
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
    } = resolveModel(
        resourceDocument
    );

    const preparedData =
    provider === "mongoose"
        ? normalizeMongoValues(
            prepareCreateData(
                Model,
                projectId,
                data
            )
        )
        : {
            ...data,
            project: projectId
        };

    const validation =
        await validateResourceData({
            projectId,
            resourceDocument,
            data: preparedData
        });

    if (!validation.success) {
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
            data: record
        };
    }

    const record =
        await ResourceData.create({
            project: projectId,
            resource:
                resourceDocument._id,
            data: preparedData,
            metadata:
                metadata || {}
        });

    return {
        success: true,
        data: record
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
    } = resolveModel(
        resourceDocument
    );

    const safeFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter)
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

        if (options.select) {
            query =
                query.select(
                    options.select
                );
        }

        if (options.sort) {
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
                    Math.max(
                        Number(options.skip) || 0,
                        0
                    )
                );
        }

        if (
            options.limit !== undefined
        ) {
            const limit =
                Number(options.limit);

            if (
                Number.isFinite(limit) &&
                limit > 0
            ) {
                query =
                    query.limit(
                        limit
                    );
            }
        }

        const records =
            await query;

        return {
            success: true,
            data: records
        };
    }

    const records =
        await ResourceData.find({
            project: projectId,
            resource:
                resourceDocument._id,
            ...safeFilter
        });

    return {
        success: true,
        data: records
    };
}


// ============================================================
// FIND ONE
// ============================================================
//
// Supports:
//
//   id
//   filter
//
// IMPORTANT:
//
// A normal findOne requires an ID or filter.
//
// However, a resource operation may explicitly declare
// that it is a read-only operation that does not require
// a record.
//
// Example:
//
// {
//     "operation": "findOne",
//     "filter": {},
//     "allowEmptyFilter": true
// }
//
// This allows configuration-driven read-only operations
// without hard-coding action names such as system.ping.
//
// ============================================================

async function findOne({
    projectId,
    resource,
    id = null,
    filter = {},
    allowEmptyFilter = false,
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

    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";

    const hasFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter) &&
        Object.keys(filter).length > 0;

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
    } = resolveModel(
        resourceDocument
    );

    // --------------------------------------------------------
    // Generic read-only empty-filter behavior
    // --------------------------------------------------------
    //
    // If explicitly allowed by the operation configuration,
    // perform a safe first-record lookup instead of rejecting
    // the request.
    //
    // This is configuration-driven and not action-specific.
    //
    if (
        !hasId &&
        !hasFilter &&
        allowEmptyFilter
    ) {
        if (
            provider === "mongoose"
        ) {
            const query = {
                ...buildProjectFilter(
                    Model,
                    projectId
                )
            };

            let mongooseQuery =
                Model.findOne(
                    query
                );

            if (options.select) {
                mongooseQuery =
                    mongooseQuery.select(
                        options.select
                    );
            }

            if (options.sort) {
                mongooseQuery =
                    mongooseQuery.sort(
                        options.sort
                    );
            }

            const record =
                await mongooseQuery;

            if (!record) {
                return {
                    success: true,
                    data: null,
                    found: false
                };
            }

            return {
                success: true,
                data: record,
                found: true
            };
        }

        const record =
            await ResourceData.findOne({
                project: projectId,
                resource:
                    resourceDocument._id
            });

        if (!record) {
            return {
                success: true,
                data: null,
                found: false
            };
        }

        return {
            success: true,
            data: record,
            found: true
        };
    }

    // --------------------------------------------------------
    // Existing strict behavior
    // --------------------------------------------------------

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
                _id: id
            }
            : {
                ...filter
            };

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

        let mongooseQuery =
            Model.findOne(
                query
            );

        if (options.select) {
            mongooseQuery =
                mongooseQuery.select(
                    options.select
                );
        }

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
            data: record
        };
    }

    const record =
        await ResourceData.findOne({
            project: projectId,
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
    } = resolveModel(
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
                _id: id
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

    if (!validation.success) {
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
                    $set: data
                };

        const record =
            await Model.findOneAndUpdate(
                query,
                updateData,
                {
                    returnDocument: "after",
                    runValidators: true
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
            data: record
        };
    }

    const record =
        await ResourceData.findOneAndUpdate(
            {
                project: projectId,
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
                returnDocument: "after"
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
        data: record
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
    } = resolveModel(
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
                _id: id
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
            data: record
        };
    }

    const record =
        await ResourceData.findOneAndDelete({
            project: projectId,
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
    amount = 1,
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

    if (!field) {
        return {
            success: false,
            message: "Increment field is required"
        };
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
        return {
            success: false,
            message: "Invalid increment amount"
        };
    }

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

    const {
        provider,
        Model
    } = resolveModel(resourceDocument);

    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";

    const safeFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter)
            ? { ...filter }
            : {};

    const lookup = hasId
        ? { _id: id }
        : safeFilter;

    if (
        !hasId &&
        Object.keys(lookup).length === 0
    ) {
        return {
            success: false,
            message: "Record ID or filter is required"
        };
    }

    if (provider === "mongoose") {
        const record =
            await Model.findOneAndUpdate(
                {
                    ...buildProjectFilter(
                        Model,
                        projectId
                    ),
                    ...lookup
                },
                {
                    $inc: {
                        [field]: numericAmount
                    }
                },
                {
                    returnDocument: "after",
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

    const record =
        await ResourceData.findOne({
            project: projectId,
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

    const current =
        Number(
            record.data?.[field] ?? 0
        );

    record.data = {
        ...(record.data || {}),
        [field]:
            current + numericAmount
    };

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
    amount = 1,
    filter = {}
}) {
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

    return increment({
        projectId,
        resource,
        id,
        field,
        amount:
            -numericAmount,
        filter
    });
}


// ============================================================
// ATOMIC ADJUST
// ============================================================

async function atomicAdjust({
    projectId,
    resource,
    id,
    field,
    amount = 0,
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
                "Adjustment field is required"
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
                "Invalid adjustment amount"
        };
    }

    if (
        numericAmount === 0
    ) {
        return findOne({
            projectId,
            resource,
            id,
            filter
        });
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
    } = resolveModel(
        resourceDocument
    );

    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";

    const safeFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter)
            ? {
                ...filter
            }
            : {};

    const lookup =
        hasId
            ? {
                _id: id
            }
            : safeFilter;

    if (
        !hasId &&
        Object.keys(lookup).length === 0
    ) {
        return {
            success: false,
            message:
                "Record ID or filter is required"
        };
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

        const record =
            await Model.findOneAndUpdate(
                query,
                {
                    $inc: {
                        [field]:
                            numericAmount
                    }
                },
                {
                    returnDocument: "after",
                    runValidators: true
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
            data: record
        };
    }

    const record =
        await ResourceData.findOne({
            project: projectId,
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

    const current =
        Number(
            record.data?.[field] ?? 0
        );

    record.data = {
        ...(record.data || {}),
        [field]:
            current + numericAmount
    };

    await record.save();

    return {
        success: true,
        data: record
    };
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
    decrement,
    atomicAdjust
};
