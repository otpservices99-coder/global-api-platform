const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");

const resourceService = require("./resourceService");


// ============================================================
// BUILT-IN RESOURCE MODELS
// ============================================================

const models = {
    User,
    Wallet,
    Notification,
    Transaction
};


// ============================================================
// MODEL RESOLVER
// ============================================================

function getModel(resource) {

    if (!resource) {
        throw new Error("Resource is required");
    }

    return models[resource] || null;
}


// ============================================================
// PATH RESOLVER
// ============================================================

function getPath(object, path) {

    if (!object || !path) {
        return undefined;
    }

    return path.split(".").reduce(
        (current, key) => {

            if (
                current === null ||
                current === undefined
            ) {
                return undefined;
            }

            return current[key];

        },
        object
    );
}


// ============================================================
// VARIABLE RESOLVER
// ============================================================

function resolveValue(value, context) {

    if (typeof value !== "string") {
        return value;
    }

    const exact = value.match(
        /^{{\s*([^}]+)\s*}}$/
    );

    if (exact) {
        return getPath(
            context,
            exact[1]
        );
    }

    return value.replace(
        /{{\s*([^}]+)\s*}}/g,
        (_, path) => {

            const result =
                getPath(context, path);

            return result === undefined
                ? ""
                : String(result);
        }
    );
}


// ============================================================
// RECURSIVE OBJECT RESOLVER
// ============================================================

function resolveObject(value, context) {

    if (Array.isArray(value)) {

        return value.map(item =>
            resolveObject(
                item,
                context
            )
        );

    }

    if (
        value &&
        typeof value === "object"
    ) {

        const output = {};

        for (const key of Object.keys(value)) {

            output[key] =
                resolveObject(
                    value[key],
                    context
                );

        }

        return output;
    }

    return resolveValue(
        value,
        context
    );
}


// ============================================================
// BUILT-IN MODEL PROJECT SAFETY
// ============================================================

function addProjectFilter(
    filter,
    projectId,
    Model
) {

    if (
        projectId &&
        Model.schema.path("project")
    ) {
        filter.project = projectId;
    }

    return filter;
}


// ============================================================
// BUILT-IN MODEL: CREATE
// ============================================================

async function createModelResource(
    Model,
    config,
    context
) {

    const data =
        resolveObject(
            config.data || {},
            context
        );

    if (
        context.projectId &&
        Model.schema.path("project")
    ) {
        data.project =
            context.projectId;
    }

    const document =
        await Model.create(data);

    return {
        success: true,
        data: document
    };
}


// ============================================================
// BUILT-IN MODEL: FIND
// ============================================================

async function findModelResource(
    Model,
    config,
    context
) {

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    addProjectFilter(
        filter,
        context.projectId,
        Model
    );

    let query =
        Model.find(filter);

    if (Array.isArray(config.populate)) {

        for (
            const field of config.populate
        ) {
            query =
                query.populate(field);
        }
    }

    if (config.limit) {

        query =
            query.limit(
                Number(config.limit)
            );
    }

    const data =
        await query;

    return {
        success: true,
        data
    };
}


// ============================================================
// BUILT-IN MODEL: FIND ONE
// ============================================================

async function findOneModelResource(
    Model,
    config,
    context
) {

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    addProjectFilter(
        filter,
        context.projectId,
        Model
    );

    const data =
        await Model.findOne(filter);

    if (!data) {

        return {
            success: false,
            message: "Resource not found"
        };
    }

    return {
        success: true,
        data
    };
}


// ============================================================
// BUILT-IN MODEL: UPDATE
// ============================================================

async function updateModelResource(
    Model,
    config,
    context
) {

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    addProjectFilter(
        filter,
        context.projectId,
        Model
    );

    const update =
        resolveObject(
            config.update || {},
            context
        );

    const document =
        await Model.findOneAndUpdate(
            filter,
            update,
            {
                new: true,
                runValidators: true
            }
        );

    if (!document) {

        return {
            success: false,
            message: "Resource not found"
        };
    }

    return {
        success: true,
        data: document
    };
}


// ============================================================
// BUILT-IN MODEL: DELETE
// ============================================================

async function deleteModelResource(
    Model,
    config,
    context
) {

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    addProjectFilter(
        filter,
        context.projectId,
        Model
    );

    const result =
        await Model.deleteOne(filter);

    if (result.deletedCount === 0) {

        return {
            success: false,
            message: "Resource not found"
        };
    }

    return {
        success: true,
        deleted: true
    };
}


// ============================================================
// BUILT-IN MODEL: INCREMENT
// ============================================================

async function incrementModelResource(
    Model,
    config,
    context
) {

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    addProjectFilter(
        filter,
        context.projectId,
        Model
    );

    const field =
        config.field;

    if (!field) {

        throw new Error(
            "Increment field is required"
        );
    }

    const amount =
        Number(
            resolveValue(
                config.amount ?? 1,
                context
            )
        );

    if (!Number.isFinite(amount)) {

        throw new Error(
            "Invalid increment amount"
        );
    }

    const document =
        await Model.findOneAndUpdate(
            filter,
            {
                $inc: {
                    [field]: amount
                }
            },
            {
                new: true
            }
        );

    if (!document) {

        return {
            success: false,
            message: "Resource not found"
        };
    }

    return {
        success: true,
        data: document
    };
}


// ============================================================
// DYNAMIC RESOURCE: CREATE
// ============================================================

async function createDynamicResource(
    resource,
    config,
    context
) {

    return resourceService.create({

        projectId:
            context.projectId,

        resource,

        data:
            resolveObject(
                config.data || {},
                context
            ),

        metadata:
            resolveObject(
                config.metadata || {},
                context
            )

    });
}


// ============================================================
// DYNAMIC RESOURCE: FIND
// ============================================================

async function findDynamicResource(
    resource,
    config,
    context
) {

    return resourceService.find({

        projectId:
            context.projectId,

        resource,

        filter:
            resolveObject(
                config.filter || {},
                context
            ),

        options:
            resolveObject(
                config.options || {},
                context
            )

    });
}


// ============================================================
// DYNAMIC RESOURCE: FIND ONE
// ============================================================

async function findOneDynamicResource(
    resource,
    config,
    context
) {

    const id =
        resolveValue(
            config.id,
            context
        );

    return resourceService.findOne({

        projectId:
            context.projectId,

        resource,

        id

    });
}


// ============================================================
// DYNAMIC RESOURCE: UPDATE
// ============================================================

async function updateDynamicResource(
    resource,
    config,
    context
) {

    const id =
        resolveValue(
            config.id,
            context
        );

    const data =
        resolveObject(
            config.data || {},
            context
        );

    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id,

        data,

        replace:
            config.replace !== false

    });
}


// ============================================================
// DYNAMIC RESOURCE: DELETE
// ============================================================

async function deleteDynamicResource(
    resource,
    config,
    context
) {

    const id =
        resolveValue(
            config.id,
            context
        );

    return resourceService.remove({

        projectId:
            context.projectId,

        resource,

        id

    });
}


// ============================================================
// DYNAMIC RESOURCE: INCREMENT / DECREMENT
// ============================================================

async function incrementDynamicResource(
    resource,
    config,
    context
) {

    const id =
        resolveValue(
            config.id,
            context
        );

    const field =
        config.field;

    const amount =
        Number(
            resolveValue(
                config.amount ?? 1,
                context
            )
        );

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

    if (!Number.isFinite(amount)) {

        return {
            success: false,
            message: "Invalid increment amount"
        };
    }

    const existing =
        await resourceService.findOne({

            projectId:
                context.projectId,

            resource,

            id

        });

    if (!existing.success) {
        return existing;
    }

    const current =
        Number(
            existing.data.data?.[field] || 0
        );

    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id,

        data: {
            [field]:
                current + amount
        },

        replace: false

    });
}


// ============================================================
// DYNAMIC RESOURCE EXECUTOR
// ============================================================

async function executeDynamicResourceAction(
    operation,
    resource,
    config,
    context
) {

    switch (operation) {

        case "create":

            return createDynamicResource(
                resource,
                config,
                context
            );

        case "find":

        case "read":

            return findDynamicResource(
                resource,
                config,
                context
            );

        case "findOne":

            return findOneDynamicResource(
                resource,
                config,
                context
            );

        case "update":

            return updateDynamicResource(
                resource,
                config,
                context
            );

        case "delete":

            return deleteDynamicResource(
                resource,
                config,
                context
            );

        case "increment":

            return incrementDynamicResource(
                resource,
                config,
                context
            );

        case "decrement":

            return incrementDynamicResource(
                resource,
                {
                    ...config,
                    amount:
                        -Math.abs(
                            Number(
                                resolveValue(
                                    config.amount ?? 1,
                                    context
                                )
                            )
                        )
                },
                context
            );

        default:

            return {
                success: false,
                message:
                    `Unsupported action operation: ${operation}`
            };
    }
}


// ============================================================
// MAIN UNIVERSAL ACTION EXECUTOR
// ============================================================

async function executeUniversalAction({
    actionRecord,
    projectId,
    actorId = null,
    userId = null,
    data = {},
    req = null
}) {

    if (!actionRecord) {

        return {
            success: false,
            message: "Action definition is required"
        };
    }

    const config =
        actionRecord.config || {};

    const operation =
        config.operation ||
        actionRecord.operation;

    const resource =
        config.resource ||
        actionRecord.resource;

    if (!operation) {

        return {
            success: false,
            message:
                "Action operation is not defined"
        };
    }

    if (!resource) {

        return {
            success: false,
            message:
                "Action resource is not defined"
        };
    }

    const context = {

        projectId,

        actorId,

        userId,

        data,

        req
    };


    // ========================================================
    // DYNAMIC RESOURCE FIRST
    // ========================================================

    const dynamicResource =
        await resourceService.getResource({

            projectId,

            resource

        });


    if (dynamicResource) {

        return executeDynamicResourceAction(

            operation,

            resource,

            config,

            context

        );

    }


    // ========================================================
    // BUILT-IN MODEL SECOND
    // ========================================================

    const Model =
        getModel(resource);

    if (!Model) {

        return {
            success: false,
            message:
                `Unknown resource: ${resource}`
        };
    }


    switch (operation) {

        case "create":

            return createModelResource(
                Model,
                config,
                context
            );

        case "find":

        case "read":

            return findModelResource(
                Model,
                config,
                context
            );

        case "findOne":

            return findOneModelResource(
                Model,
                config,
                context
            );

        case "update":

            return updateModelResource(
                Model,
                config,
                context
            );

        case "delete":

            return deleteModelResource(
                Model,
                config,
                context
            );

        case "increment":

            return incrementModelResource(
                Model,
                config,
                context
            );

        case "decrement":

            return incrementModelResource(

                Model,

                {
                    ...config,

                    amount:
                        -Math.abs(
                            Number(
                                resolveValue(
                                    config.amount ?? 1,
                                    context
                                )
                            )
                        )
                },

                context

            );

        default:

            return {
                success: false,
                message:
                    `Unsupported action operation: ${operation}`
            };
    }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    executeUniversalAction,

    resolveValue,

    resolveObject

};
