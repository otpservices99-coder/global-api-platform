const resourceService =
    require("./resourceService");


// ============================================================
// VARIABLE RESOLUTION
// ============================================================

function getPath(object, path) {

    if (!object || !path) {
        return undefined;
    }

    return String(path)
        .split(".")
        .reduce((value, key) => {

            if (
                value === undefined ||
                value === null
            ) {
                return undefined;
            }

            return value[key];

        }, object);
}


function resolveValue(value, context) {

    if (typeof value !== "string") {
        return value;
    }

    const exact =
        value.match(/^{{\s*([^}]+)\s*}}$/);

    if (exact) {

        return getPath(
            context,
            exact[1].trim()
        );

    }

    return value.replace(
        /{{\s*([^}]+)\s*}}/g,
        (_, path) => {

            const result =
                getPath(
                    context,
                    path.trim()
                );

            return (
                result === undefined ||
                result === null
            )
                ? ""
                : String(result);

        }
    );
}


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
// MERGE DATA
// ============================================================

function mergeObjects(base = {}, override = {}) {

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
// RESOLVE DATABASE OPERATION
// ============================================================

async function resolveOperation({
    resourceDocument,
    operation,
    config,
    context
}) {

    const settings =
        resourceDocument.settings || {};

    const operations =
        settings.operations || {};

    const definition =
        operations[operation];

    /*
     * No custom definition.
     *
     * Fall back to the built-in generic CRUD
     * operations.
     */

    if (
        !definition ||
        typeof definition !== "object"
    ) {

        return {
            operation,
            config
        };

    }

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
     * {
     *   operation: "update",
     *   data: {
     *      status: "active"
     *   }
     * }
     */

    const actualOperation =
        resolvedDefinition.operation ||
        operation;

    const mergedConfig = {
        ...config,
        ...resolvedDefinition
    };

    /*
     * Runtime action data must be able to
     * override configured values when supplied.
     */

    if (
        config.data &&
        resolvedDefinition.data &&
        typeof config.data === "object" &&
        typeof resolvedDefinition.data === "object"
    ) {

        mergedConfig.data =
            mergeObjects(
                resolvedDefinition.data,
                config.data
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
        config.id;

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


    if (!Number.isFinite(amount)) {

        throw new Error(
            "Invalid increment amount"
        );

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
            existing.data?.[field] ?? 0
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
     * Load the resource definition from the
     * database.
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
     * Resolve custom operation from the
     * resource's database settings.
     */

    const resolved =
        await resolveOperation({

            resourceDocument,

            operation,

            config,

            context

        });


    const resolvedConfig =
        resolveObject(
            resolved.config,
            context
        );


    const actualOperation =
        resolved.operation;


    /*
     * Check operation permissions.
     *
     * Generic operations and custom operations
     * are both controlled by Resource settings.
     */

    const operations =
        resourceDocument.settings?.operations || {};

    const operationDefinition =
        operations[operation];


    if (
        operationDefinition === false
    ) {

        throw new Error(
            `Operation '${operation}' is disabled for resource '${resource}'`
        );

    }


    /*
     * If the custom operation exists but does not
     * resolve to a valid operation, reject it.
     */

    if (
        operationDefinition &&
        typeof operationDefinition === "object" &&
        !operationDefinition.operation
    ) {

        throw new Error(
            `Operation '${operation}' is not configured correctly`
        );

    }


    switch (actualOperation) {

        // ----------------------------------------------------
        // CREATE
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // FIND
        // ----------------------------------------------------

        case "find":

        case "read":

            return resourceService.find({

                projectId:
                    context.projectId,

                resource,

                filter:
                    resolvedConfig.filter || {},

                options:
                    resolvedConfig.options || {}

            });


        // ----------------------------------------------------
        // FIND ONE
        // ----------------------------------------------------

        case "findOne":

        case "get":

            return resourceService.findOne({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolvedConfig.id

            });


        // ----------------------------------------------------
        // UPDATE
        // ----------------------------------------------------

        case "update":

            return resourceService.update({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolvedConfig.id,

                data:
                    resolvedConfig.data || {},

                replace:
                    resolvedConfig.replace !== false

            });


        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------

        case "delete":

        case "remove":

            return resourceService.remove({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolvedConfig.id

            });


        // ----------------------------------------------------
        // INCREMENT
        // ----------------------------------------------------

        case "increment":

            return increment(

                resource,

                resolvedConfig,

                context

            );


        // ----------------------------------------------------
        // DECREMENT
        // ----------------------------------------------------

        case "decrement":

            return increment(

                resource,

                {
                    ...resolvedConfig,

                    amount:
                        -Math.abs(
                            Number(
                                resolvedConfig.amount ?? 1
                            )
                        )

                },

                context

            );


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


    const config =
        actionRecord.config || {};


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
     * Resource and operation come from
     * Action configuration.
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
     * Build runtime configuration.
     *
     * Action config can contain:
     *
     * {
     *   resource: "user",
     *   operation: "unsuspend",
     *   id: "{{data.user}}"
     * }
     */

    const runtimeConfig = {
        ...config
    };


    /*
     * If an ID was supplied through event data,
     * allow:
     *
     * id: "{{data.user}}"
     *
     * to resolve normally.
     */

    return executeResourceAction(

        resource,

        operation,

        runtimeConfig,

        context

    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    executeUniversalAction,

    resolveValue,

    resolveObject,

    resolveOperation

};
