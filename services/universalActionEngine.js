const resourceService =
    require("./resourceService");


// ============================================================
// VALUE RESOLVER
// ============================================================

function getPath(object, path) {

    if (!object || !path) {
        return undefined;
    }

    return String(path)
        .split(".")
        .reduce(
            (current, key) =>
                current == null
                    ? undefined
                    : current[key],
            object
        );
}


function resolveValue(value, context) {

    if (typeof value !== "string") {
        return value;
    }

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

    return value.replace(
        /{{\s*([^}]+)\s*}}/g,
        (_, path) => {

            const result =
                getPath(
                    context,
                    path.trim()
                );

            return result == null
                ? ""
                : String(result);
        }
    );
}


// ============================================================
// RECURSIVE VALUE RESOLVER
// ============================================================

function resolveObject(
    value,
    context
) {

    if (Array.isArray(value)) {

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
// RESOURCE OPERATION CHECK
// ============================================================

function isOperationAllowed(
    resourceDefinition,
    operation
) {

    const operations =
        resourceDefinition
            ?.settings
            ?.operations;


    /*
     * If the Resource has no operation configuration,
     * preserve generic backward compatibility.
     *
     * Once operations are defined, they become the
     * Resource's explicit operation contract.
     */

    if (!operations) {
        return true;
    }


    return operations[operation] === true;
}


// ============================================================
// DYNAMIC RESOURCE ACTION
// ============================================================

async function executeDynamicAction(
    resource,
    operation,
    config,
    context
) {

    switch (operation) {

        // ====================================================
        // CREATE
        // ====================================================

        case "create":

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


        // ====================================================
        // FIND / READ
        // ====================================================

        case "find":
        case "read":

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


        // ====================================================
        // FIND ONE
        // ====================================================

        case "findOne":

            return resourceService.findOne({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolveValue(
                        config.id,
                        context
                    )

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
                    resolveValue(
                        config.id,
                        context
                    ),

                data:
                    resolveObject(
                        config.data || {},
                        context
                    ),

                replace:
                    config.replace !== false

            });


        // ====================================================
        // DELETE
        // ====================================================

        case "delete":

            return resourceService.remove({

                projectId:
                    context.projectId,

                resource,

                id:
                    resolveValue(
                        config.id,
                        context
                    )

            });


        // ====================================================
        // INCREMENT
        // ====================================================

        case "increment": {

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

                    message:
                        "Record ID is required"
                };

            }


            if (!field) {

                return {
                    success: false,

                    message:
                        "Field is required"
                };

            }


            if (!Number.isFinite(amount)) {

                return {
                    success: false,

                    message:
                        "Invalid increment amount"
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
                    existing.data?.data?.[field] || 0
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


        // ====================================================
        // DECREMENT
        // ====================================================

        case "decrement":

            return executeDynamicAction(

                resource,

                "increment",

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


        // ====================================================
        // UNSUPPORTED OPERATION
        // ====================================================

        default:

            return {

                success: false,

                message:
                    `Unsupported operation: ${operation}`

            };

    }

}


// ============================================================
// UNIVERSAL ACTION EXECUTOR
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

            message:
                "Action definition is required"

        };

    }


    if (!projectId) {

        return {

            success: false,

            message:
                "Project ID is required"

        };

    }


    const config =
        actionRecord.config || {};


    const resource =
        resolveValue(
            config.resource,
            {
                projectId,
                actorId,
                userId,
                data,
                req
            }
        );


    const operation =
        resolveValue(
            config.operation,
            {
                projectId,
                actorId,
                userId,
                data,
                req
            }
        );


    if (!resource) {

        return {

            success: false,

            message:
                "Action resource is not defined"

        };

    }


    if (!operation) {

        return {

            success: false,

            message:
                "Action operation is not defined"

        };

    }


    // ========================================================
    // GET RESOURCE DEFINITION
    // ========================================================

    const resourceDefinition =
        await resourceService.getResource({

            projectId,

            resource

        });


    if (!resourceDefinition) {

        return {

            success: false,

            message:
                `Resource '${resource}' is not available`

        };

    }


    // ========================================================
    // CHECK RESOURCE OPERATION
    // ========================================================

    if (
        !isOperationAllowed(
            resourceDefinition,
            operation
        )
    ) {

        return {

            success: false,

            message:
                `Operation '${operation}' is not enabled for resource '${resource}'`

        };

    }


    // ========================================================
    // EXECUTION CONTEXT
    // ========================================================

    const context = {

        projectId,

        actorId,

        userId,

        data,

        req,

        action:
            actionRecord,

        resource:
            resourceDefinition

    };


    // ========================================================
    // EXECUTE GENERIC OPERATION
    // ========================================================

    return executeDynamicAction(

        resource,

        operation,

        config,

        context

    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    executeUniversalAction,

    resolveValue,

    resolveObject

};
