const resourceService =
    require("./resourceService");


// ============================================================
// PATH / VARIABLE RESOLUTION
// ============================================================

function getPath(object, path) {

    if (
        object === undefined ||
        object === null ||
        !path
    ) {

        return undefined;

    }


    return String(path)
        .split(".")
        .reduce(
            (value, key) => {

                if (
                    value === undefined ||
                    value === null
                ) {

                    return undefined;

                }

                return value[key];

            },
            object
        );

}


// ============================================================
// RESOLVE VALUE
// ============================================================

function resolveValue(
    value,
    context = {}
) {

    if (
        typeof value !== "string"
    ) {

        return value;

    }


    /*
     * Exact template:
     *
     * "{{data.user}}"
     *
     * Preserve the original type.
     *
     * This is important for MongoDB ObjectIds,
     * numbers, booleans, etc.
     */

    const exact =
        value.match(
            /^{{\s*([^}]+)\s*}}$/
        );


    if (exact) {

        return getPath(
            context,
            exact[1].trim()
        );

    }


    /*
     * Embedded templates.
     */

    return value.replace(
        /{{\s*([^}]+)\s*}}/g,
        (_, path) => {

            const result =
                getPath(
                    context,
                    path.trim()
                );


            if (
                result === undefined ||
                result === null
            ) {

                return "";

            }


            return String(result);

        }
    );

}


// ============================================================
// RESOLVE OBJECT
// ============================================================

function resolveObject(
    value,
    context = {}
) {

    if (
        Array.isArray(value)
    ) {

        return value.map(
            item =>
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


        for (
            const key of Object.keys(value)
        ) {

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
// MERGE OBJECTS
// ============================================================

function mergeObjects(
    base = {},
    override = {}
) {

    if (
        !base ||
        typeof base !== "object" ||
        Array.isArray(base)
    ) {

        return override;

    }


    if (
        !override ||
        typeof override !== "object" ||
        Array.isArray(override)
    ) {

        return base;

    }


    return {

        ...base,

        ...override

    };

}


// ============================================================
// RESOLVE RECORD ID
// ============================================================

function resolveRecordId(
    config = {},
    context = {}
) {

    const explicitId =
        config.id;


    if (
        explicitId !== undefined &&
        explicitId !== null &&
        explicitId !== ""
    ) {

        return explicitId;

    }


    const data =
        context.data || {};


    const candidates = [

        data.id,

        data._id,

        data.user,

        data.userId,

        context.userId,

        context.entityId,

        context.event?.entityId,

        context.event?.userId

    ];


    for (
        const candidate of candidates
    ) {

        if (
            candidate !== undefined &&
            candidate !== null &&
            candidate !== ""
        ) {

            return candidate;

        }

    }


    return null;

}


// ============================================================
// RESOLVE DATABASE OPERATION
// ============================================================

async function resolveOperation({
    resourceDocument,
    operation,
    config = {},
    context = {}
}) {

    const settings =
        resourceDocument?.settings || {};


    const operations =
        settings.operations || {};


    const definition =
        operations[operation];


    /*
     * No custom definition.
     *
     * Use the requested operation directly.
     */

    if (
        !definition ||
        typeof definition !== "object"
    ) {

        return {

            operation,

            config:
                resolveObject(
                    config,
                    context
                )

        };

    }


    /*
     * Resolve the entire configured definition
     * using the COMPLETE runtime context.
     */

    const resolvedDefinition =
        resolveObject(
            definition,
            context
        );


    /*
     * Database operation alias.
     *
     * Example:
     *
     * unsuspend:
     *
     * {
     *     operation: "update",
     *     data: {
     *         status: "active"
     *     }
     * }
     */

    const actualOperation =
        resolvedDefinition.operation ||
        operation;


    /*
     * Resolve runtime Action configuration too.
     *
     * This is important because both the Action
     * configuration and Resource operation may
     * contain templates.
     */

    const resolvedConfig =
        resolveObject(
            config,
            context
        );


    const mergedConfig = {

        ...resolvedConfig,

        ...resolvedDefinition

    };


    /*
     * Runtime action data overrides configured data.
     */

    if (
        resolvedConfig.data &&
        resolvedDefinition.data &&
        typeof resolvedConfig.data === "object" &&
        typeof resolvedDefinition.data === "object" &&
        !Array.isArray(resolvedConfig.data) &&
        !Array.isArray(resolvedDefinition.data)
    ) {

        mergedConfig.data =
            mergeObjects(
                resolvedDefinition.data,
                resolvedConfig.data
            );

    }


    return {

        operation:
            actualOperation,

        config:
            mergedConfig

    };

}


// ============================================================
// DYNAMIC INCREMENT
// ============================================================

async function increment(
    resource,
    config,
    context
) {

    const id =
        resolveRecordId(
            config,
            context
        );


    const field =
        config.field;


    const amount =
        Number(
            config.amount ?? 1
        );


    if (!id) {

        throw new Error(
            "Record ID is required"
        );

    }


    if (!field) {

        throw new Error(
            "Increment field is required"
        );

    }


    if (
        !Number.isFinite(amount)
    ) {

        throw new Error(
            "Invalid increment amount"
        );

    }


    const existing =
        await resourceService.findOne({

            projectId:
                context.projectId,

            resource,

            id,

            filter:
                config.filter || {}

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


    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id:
            existing.data?._id,

        data: {

            [field]:
                current + amount

        },

        replace:
            false

    });

}


// ============================================================
// DYNAMIC DECREMENT
// ============================================================

async function decrement(
    resource,
    config,
    context
) {

    const id =
        resolveRecordId(
            config,
            context
        );


    const field =
        config.field;


    const amount =
        Number(
            config.amount ?? 1
        );


    if (!id) {

        throw new Error(
            "Record ID is required"
        );

    }


    if (!field) {

        throw new Error(
            "Decrement field is required"
        );

    }


    if (
        !Number.isFinite(amount)
    ) {

        throw new Error(
            "Invalid decrement amount"
        );

    }


    const existing =
        await resourceService.findOne({

            projectId:
                context.projectId,

            resource,

            id,

            filter:
                config.filter || {}

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


    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id:
            existing.data?._id,

        data: {

            [field]:
                current - amount

        },

        replace:
            false

    });

}


// ============================================================
// EXECUTE RESOURCE ACTION
// ============================================================

async function executeResourceAction(
    resource,
    operation,
    config,
    context
) {

    if (!resource) {

        throw new Error(
            "Action resource is required"
        );

    }


    if (!operation) {

        throw new Error(
            "Action operation is required"
        );

    }


    /*
     * Load resource definition.
     */

    const resourceDocument =
        await resourceService.getResource({

            projectId:
                context.projectId,

            resource

        });


    if (!resourceDocument) {

        throw new Error(
            `Resource '${resource}' not found`
        );

    }


    /*
     * Resolve the operation definition
     * against the complete runtime context.
     */

    const resolved =
        await resolveOperation({

            resourceDocument,

            operation,

            config,

            context

        });


    /*
     * Resolve one final time after merging.
     *
     * This guarantees nested values such as:
     *
     * filter.user
     * data.user
     * id
     * amount
     *
     * are fully resolved.
     */

    const resolvedConfig =
        resolveObject(
            resolved.config,
            context
        );


    const actualOperation =
        resolved.operation;


    /*
     * Check operation permissions/configuration.
     */

    const operations =
        resourceDocument.settings?.operations ||
        {};


    const operationDefinition =
        operations[operation];


    if (
        operationDefinition === false
    ) {

        throw new Error(
            `Operation '${operation}' is disabled for resource '${resource}'`
        );

    }


    if (
        operationDefinition &&
        typeof operationDefinition === "object" &&
        !operationDefinition.operation
    ) {

        throw new Error(
            `Operation '${operation}' is not configured correctly`
        );

    }


    /*
     * Execute generic operation.
     */

    switch (
        actualOperation
    ) {


        // ====================================================
        // CREATE
        // ====================================================

        case "create":

            return resourceService.create({

                projectId:
                    context.projectId,

                resource,

                data:
                    resolvedConfig.data || {},

                metadata:
                    resolvedConfig.metadata || {}

            });


        // ====================================================
        // FIND
        // ====================================================

        case "find":

        case "list":

            return resourceService.find({

                projectId:
                    context.projectId,

                resource,

                filter:
                    resolvedConfig.filter || {},

                options:
                    resolvedConfig.options || {}

            });


        // ====================================================
        // FIND ONE
        // ====================================================

        case "findOne":

        case "get":

            return resourceService.findOne({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolvedConfig.id || null,

                filter:
                    resolvedConfig.filter || {},

                options:
                    resolvedConfig.options || {}

            });


        // ====================================================
        // UPDATE
        // ====================================================

        case "update":

            return resourceService.update({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolveRecordId(
                        resolvedConfig,
                        context
                    ),

                filter:
                    resolvedConfig.filter || {},

                data:
                    resolvedConfig.data || {},

                replace:
                    resolvedConfig.replace === true

            });


        // ====================================================
        // DELETE
        // ====================================================

        case "delete":

        case "remove":

            return resourceService.remove({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolveRecordId(
                        resolvedConfig,
                        context
                    ),

                filter:
                    resolvedConfig.filter || {}

            });


        // ====================================================
        // INCREMENT
        // ====================================================

        case "increment":

            return increment(

                resource,

                resolvedConfig,

                context

            );


        // ====================================================
        // DECREMENT
        // ====================================================

        case "decrement":

            return decrement(

                resource,

                resolvedConfig,

                context

            );


        // ====================================================
        // UNSUPPORTED
        // ====================================================

        default:

            throw new Error(
                `Unsupported operation: ${actualOperation}`
            );

    }

}


// ============================================================
// UNIVERSAL ACTION
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

        throw new Error(
            "Action definition is required"
        );

    }


    if (!projectId) {

        throw new Error(
            "Project ID is required"
        );

    }


    /*
     * Complete runtime context.
     */

    const context = {

        projectId,

        actorId,

        userId,

        data,

        req,

        action:
            actionRecord

    };


    /*
     * Action configuration.
     */

    const config =
        actionRecord.config || {};


    /*
     * Resolve resource and operation
     * from the ORIGINAL action config.
     */

    const resource =
        resolveValue(
            config.resource,
            context
        );


    const operation =
        resolveValue(
            config.operation,
            context
        );


    /*
     * Resolve the entire Action configuration
     * before passing it into the resource layer.
     */

    const resolvedRuntimeConfig =
        resolveObject(
            config,
            context
        );


    /*


    /*
     * Execute resource action.
     */

    return executeResourceAction(

        resource,

        operation,

        resolvedRuntimeConfig,

        context

    );

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    executeUniversalAction,

    resolveValue,

    resolveObject,

    resolveOperation,

    resolveRecordId

};
