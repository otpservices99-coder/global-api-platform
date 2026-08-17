const resourceService =
    require("./resourceService");


// ============================================================
// VALUE RESOLUTION
// ============================================================

function getPath(object, path) {

    if (
        object === undefined ||
        object === null
    ) {
        return undefined;
    }

    if (
        typeof path !== "string" ||
        !path
    ) {
        return undefined;
    }

    return path
        .split(".")
        .reduce(
            (current, key) =>
                current === undefined ||
                current === null
                    ? undefined
                    : current[key],
            object
        );
}


// ============================================================
// PLAIN OBJECT DETECTION
// ============================================================
//
// IMPORTANT:
//
// Only recursively resolve real plain JavaScript objects.
//
// MongoDB ObjectId, Date, Mongoose documents and other
// class instances MUST remain untouched.
//
// This is what keeps the universal resolver truly generic.
// ============================================================

function isPlainObject(value) {

    if (
        value === null ||
        typeof value !== "object"
    ) {
        return false;
    }

    const prototype =
        Object.getPrototypeOf(value);

    return (
        prototype === Object.prototype ||
        prototype === null
    );
}


// ============================================================
// VALUE RESOLUTION
// ============================================================

function resolveValue(
    value,
    context = {}
) {

    /*
     * Non-string values are already resolved.
     *
     * IMPORTANT:
     * ObjectId instances must pass through untouched.
     */

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
     * Return the original value instead of converting it
     * to a string.
     *
     * This is critical for:
     *
     * ObjectId
     * Number
     * Boolean
     * Date
     * Arrays
     * Objects
     */

    const exact =
        value.match(
            /^\{\{\s*([^}]+?)\s*\}\}$/
        );


    if (exact) {

        const resolved =
            getPath(
                context,
                exact[1].trim()
            );


        return resolved === undefined
            ? value
            : resolved;
    }


    /*
     * Embedded templates remain strings.
     *
     * Example:
     *
     * "user-{{data.user}}"
     */

    return value.replace(
        /\{\{\s*([^}]+?)\s*\}\}/g,

        (match, path) => {

            const resolved =
                getPath(
                    context,
                    path.trim()
                );


            return resolved === undefined
                ? match
                : String(resolved);
        }
    );
}


// ============================================================
// RECURSIVE OBJECT RESOLUTION
// ============================================================

function resolveObject(
    value,
    context = {}
) {

    /*
     * Arrays are recursively resolved.
     */

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


    /*
     * CRITICAL:
     *
     * Only recurse into plain objects.
     *
     * MongoDB ObjectId is NOT a plain object.
     * Date is NOT a plain object.
     * Mongoose documents are NOT plain objects.
     *
     * Therefore they pass through unchanged.
     */

    if (
        isPlainObject(value)
    ) {

        const output = {};

        for (
            const [key, item] of
            Object.entries(value)
        ) {

            output[key] =
                resolveObject(
                    item,
                    context
                );
        }

        return output;
    }


    /*
     * Everything else goes through resolveValue().
     *
     * This preserves ObjectId and other objects while
     * still resolving strings containing templates.
     */

    return resolveValue(
        value,
        context
    );
}


// ============================================================
// RECORD ID RESOLUTION
// ============================================================

function resolveRecordId(
    config = {},
    context = {}
) {

    const candidates = [

        config.id,

        config._id,

        config.recordId,

        config.record,

        context.id,

        context._id,

        context.data?.id,

        context.data?._id,

        context.data?.recordId

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
// SPECIAL OPERATIONS
// ============================================================

async function executeSpecialOperation(
    resource,
    operation,
    context
) {

    /*
     * Global system ping.
     *
     * This is intentionally generic and does
     * not depend on an application-specific model.
     */

    if (
        resource === "system" &&
        operation === "ping"
    ) {

        return {

            success: true,

            data: {

                pong: true,

                timestamp:
                    new Date().toISOString()

            }

        };
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
     * If the resource does not define a custom
     * mapping, execute the requested operation
     * directly.
     *
     * This keeps the engine global.
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
     * Resolve the complete resource definition.
     */

    const resolvedDefinition =
        resolveObject(
            definition,
            context
        );


    const actualOperation =
        resolvedDefinition.operation ||
        operation;


    /*
     * Resolve the Action configuration too.
     */

    const resolvedConfig =
        resolveObject(
            config,
            context
        );


    /*
     * Resource definition is the base.
     * Action configuration overrides it.
     */

    const mergedConfig = {

        ...resolvedConfig,

        ...resolvedDefinition

    };


    /*
     * Merge nested data instead of replacing it.
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


    /*
     * Merge filters too.
     *
     * This allows a Resource definition to provide
     * a default filter while an Action supplies another.
     */

    if (
        resolvedConfig.filter &&
        resolvedDefinition.filter &&
        typeof resolvedConfig.filter === "object" &&
        typeof resolvedDefinition.filter === "object"
    ) {

        mergedConfig.filter =
            mergeObjects(
                resolvedDefinition.filter,
                resolvedConfig.filter
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
//
// Supports:
//   id
//   filter
//
// Examples:
//
// {
//   operation: "increment",
//   field: "balance",
//   amount: "{{data.amount}}",
//   filter: {
//     user: "{{data.user}}"
//   }
// }
//
// OR:
//
// {
//   operation: "increment",
//   field: "balance",
//   amount: 100,
//   id: "{{data.wallet}}"
// }
//
// This is completely resource-agnostic.
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

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

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

    const hasId =
        id !== undefined &&
        id !== null &&
        id !== "";

    const hasFilter =
        filter &&
        typeof filter === "object" &&
        !Array.isArray(filter) &&
        Object.keys(filter).length > 0;

    if (!hasId && !hasFilter) {

        throw new Error(
            "Record ID or filter is required"
        );

    }

    /*
     * Find the target record generically.
     *
     * No wallet/user/product knowledge exists here.
     */
    const existing =
        await resourceService.findOne({

            projectId:
                context.projectId,

            resource,

            id:
                hasId
                    ? id
                    : null,

            filter:
                hasId
                    ? {}
                    : filter

        });

    if (!existing?.success) {

        return existing;

    }

    if (!existing.data) {

        return {

            success: false,

            message:
                "Record not found"

        };

    }

    const current =
        Number(
            existing.data?.[field] ?? 0
        );

    if (!Number.isFinite(current)) {

        throw new Error(
            `Field '${field}' is not numeric`
        );

    }

    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id:
            existing.data._id,

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
//
// Supports:
//   id
//   filter
//
// Completely resource-agnostic.
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

    const filter =
        resolveObject(
            config.filter || {},
            context
        );

    if (!field) {

        throw new Error(
            "Decrement field is required"
        );

    }

    if (!Number.isFinite(amount)) {

        throw new Error(
            "Invalid decrement amount"
        );

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

    if (!hasId && !hasFilter) {

        throw new Error(
            "Record ID or filter is required"
        );

    }

    /*
     * Generic resource lookup.
     */
    const existing =
        await resourceService.findOne({

            projectId:
                context.projectId,

            resource,

            id:
                hasId
                    ? id
                    : null,

            filter:
                hasId
                    ? {}
                    : filter

        });

    if (!existing?.success) {

        return existing;

    }

    if (!existing.data) {

        return {

            success: false,

            message:
                "Record not found"

        };

    }

    const current =
        Number(
            existing.data?.[field] ?? 0
        );

    if (!Number.isFinite(current)) {

        throw new Error(
            `Field '${field}' is not numeric`
        );

    }

    return resourceService.update({

        projectId:
            context.projectId,

        resource,

        id:
            existing.data._id,

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
     * Execute global special operations before
     * requiring a Resource document.
     */

    const specialResult =
        await executeSpecialOperation(
            resource,
            operation,
            context
        );


    if (
        specialResult !== null
    ) {

        return specialResult;
    }


    /*
     * Load resource definition dynamically.
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
     * Resolve operation against the resource.
     */

    const resolved =
        await resolveOperation({

            resourceDocument,

            operation,

            config,

            context

        });


    /*
     * Final template resolution.
     */

    const resolvedConfig =
        resolveObject(
            resolved.config,
            context
        );


    const actualOperation =
        resolved.operation;


    /*
     * Validate configured operation.
     */

    const operations =
        resourceDocument
            .settings
            ?.operations || {};


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
     * If a resource explicitly defines the operation,
     * it must contain a valid database operation.
     *
     * Otherwise resolveOperation() allows the requested
     * operation to pass through dynamically.
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
        // FANOUT
        // ====================================================

        case "fanout": {

            const sourceResource =
                resolvedConfig.sourceResource;

            const sourceFilter =
                resolvedConfig.sourceFilter || {};

            const targetResource =
                resolvedConfig.targetResource;

            const targetData =
                resolvedConfig.targetData || {};


            if (!sourceResource) {

                throw new Error(
                    "Fanout sourceResource is required"
                );
            }


            if (!targetResource) {

                throw new Error(
                    "Fanout targetResource is required"
                );
            }


            const sourceResult =
                await resourceService.find({

                    projectId:
                        context.projectId,

                    resource:
                        sourceResource,

                    filter:
                        resolveObject(
                            sourceFilter,
                            context
                        ),

                    options:
                        resolvedConfig.options || {}

                });


            const records =
                sourceResult?.data ||
                sourceResult?.results ||
                sourceResult ||
                [];


            if (
                !Array.isArray(records)
            ) {

                throw new Error(
                    "Fanout source must return an array"
                );
            }


            const created = [];


            for (
                const item of records
            ) {

                const itemContext = {

                    ...context,

                    item

                };


                const data =
                    resolveObject(
                        targetData,
                        itemContext
                    );


                created.push(

                    await resourceService.create({

                        projectId:
                            context.projectId,

                        resource:
                            targetResource,

                        data,

                        metadata:
                            resolvedConfig.metadata || {}

                    })

                );
            }


            return {

                success: true,

                count:
                    created.length,

                data:
                    created

            };
        }


        // ====================================================
        // CREATE MANY
        // ====================================================

        case "createMany": {

            const items =
                resolvedConfig.items;


            if (
                !Array.isArray(items)
            ) {

                throw new Error(
                    "createMany requires an items array"
                );
            }


            const created = [];


            for (
                const item of items
            ) {

                created.push(

                    await resourceService.create({

                        projectId:
                            context.projectId,

                        resource,

                        data:
                            resolveObject(
                                item,
                                context
                            ),

                        metadata:
                            resolvedConfig.metadata || {}

                    })

                );
            }


            return {

                success: true,

                count:
                    created.length,

                data:
                    created

            };
        }


        // ====================================================
        // UPDATE MANY
        // ====================================================

        case "updateMany": {

            const filter =
                resolvedConfig.filter || {};

            const data =
                resolvedConfig.data || {};


            const records =
                await resourceService.find({

                    projectId:
                        context.projectId,

                    resource,

                    filter:
                        resolveObject(
                            filter,
                            context
                        ),

                    options: {}

                });


            const list =
                records?.data ||
                records?.results ||
                [];


            if (
                !Array.isArray(list)
            ) {

                throw new Error(
                    "updateMany could not resolve records"
                );
            }


            const updated = [];


            for (
                const record of list
            ) {

                updated.push(

                    await resourceService.update({

                        projectId:
                            context.projectId,

                        resource,

                        id:
                            record._id,

                        data:
                            resolveObject(
                                data,
                                {
                                    ...context,
                                    item: record
                                }
                            ),

                        replace:
                            resolvedConfig.replace === true

                    })

                );
            }


            return {

                success: true,

                count:
                    updated.length,

                data:
                    updated

            };
        }


        default:

            throw new Error(
                `Unsupported database operation '${actualOperation}'`
            );
    }
}


// ============================================================
// EXECUTE UNIVERSAL ACTION
// ============================================================
//
// GLOBAL CONFIGURATION-DRIVEN EXECUTION
//
// Supported:
//
// 1. Action document
//    executeUniversalAction(actionDocument, data, context)
//
// 2. Action name + resolved action config
//    executeUniversalAction("wallet.credit", data, {
//        actionConfig: {...}
//    })
//
// 3. Composed actions
//    {
//        steps: [...]
//    }
//
// The engine never contains project-specific action names.
// Resource and operation are always resolved from configuration.
// ============================================================

async function executeUniversalAction(
    action,
    data = {},
    context = {}
) {

    if (!action) {

        throw new Error(
            "Action is required"
        );

    }


    /*
     * --------------------------------------------------------
     * ACTION NAME
     * --------------------------------------------------------
     */

    const actionName =
        typeof action === "string"
            ? action
            : action.name;


    if (!actionName) {

        throw new Error(
            "Action name is required"
        );

    }


    /*
     * --------------------------------------------------------
     * RUNTIME CONTEXT
     * --------------------------------------------------------
     *
     * Everything available to templates lives here.
     *
     * Example:
     *
     * {{data.user}}
     * {{data.amount}}
     * {{projectId}}
     * {{action}}
     */

    const runtimeContext = {

        ...context,

        data,

        action:
            actionName

    };


    /*
     * --------------------------------------------------------
     * ACTION CONFIGURATION
     * --------------------------------------------------------
     *
     * Priority:
     *
     * 1. Action document config
     * 2. context.actionConfig
     * 3. empty config
     *
     * This makes the engine work whether the caller provides
     * the complete Action document or only the action name.
     */

    let actionConfig;

    if (
        typeof action === "object" &&
        action.config &&
        typeof action.config === "object"
    ) {

        actionConfig =
            action.config;

    } else if (
        context.actionConfig &&
        typeof context.actionConfig === "object"
    ) {

        actionConfig =
            context.actionConfig;

    } else {

        actionConfig = {};

    }


    /*
     * Resolve the complete Action configuration once.
     *
     * This resolves things such as:
     *
     * {{data.user}}
     * {{data.amount}}
     * {{projectId}}
     */

    const resolvedActionConfig =
        resolveObject(
            actionConfig,
            runtimeContext
        );


    /*
     * --------------------------------------------------------
     * COMPOSED ACTION
     * --------------------------------------------------------
     */

    if (
        Array.isArray(
            resolvedActionConfig.steps
        )
    ) {

        if (
            resolvedActionConfig.steps.length === 0
        ) {

            throw new Error(
                "Action steps must be a non-empty array"
            );

        }


        const results = [];


        for (
            let index = 0;
            index < resolvedActionConfig.steps.length;
            index++
        ) {

            const step =
                resolvedActionConfig.steps[index];


            if (
                !step ||
                typeof step !== "object"
            ) {

                throw new Error(
                    `Action step ${index + 1} must be an object`
                );

            }


            /*
             * Resolve the step independently.
             *
             * This allows every step to use:
             *
             * {{data.*}}
             * {{projectId}}
             * {{item.*}}
             */

            const stepConfig =
                resolveObject(
                    step,
                    runtimeContext
                );


            const stepResource =
                resolveValue(
                    stepConfig.resource,
                    runtimeContext
                );


            const stepOperation =
                resolveValue(
                    stepConfig.operation,
                    runtimeContext
                );


            if (!stepResource) {

                throw new Error(
                    `Action step ${index + 1}: resource is required`
                );

            }


            if (!stepOperation) {

                throw new Error(
                    `Action step ${index + 1}: operation is required`
                );

            }


            const result =
                await executeResourceAction(

                    stepResource,

                    stepOperation,

                    stepConfig,

                    runtimeContext

                );


            results.push({

                resource:
                    stepResource,

                operation:
                    stepOperation,

                result

            });

        }


        return {

            success: true,

            action:
                actionName,

            results

        };

    }


    /*
     * --------------------------------------------------------
     * HANDLER COMPATIBILITY
     * --------------------------------------------------------
     *
     * Handlers remain supported for legacy/custom actions.
     *
     * The universal resource engine does not depend on them.
     */

    if (
        resolvedActionConfig.handler &&
        typeof context.executeHandler === "function"
    ) {

        return context.executeHandler(

            resolvedActionConfig.handler,

            runtimeContext

        );

    }


    /*
     * --------------------------------------------------------
     * NORMAL RESOURCE ACTION
     * --------------------------------------------------------
     */

    const resource =
        resolveValue(
            resolvedActionConfig.resource,
            runtimeContext
        );


    const operation =
        resolveValue(
            resolvedActionConfig.operation,
            runtimeContext
        );


    /*
     * --------------------------------------------------------
     * RESOURCE / OPERATION VALIDATION
     * --------------------------------------------------------
     */

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
     * --------------------------------------------------------
     * EXECUTE
     * --------------------------------------------------------
     *
     * At this point everything is resolved.
     *
     * Action
     *   ↓
     * Resource
     *   ↓
     * Operation
     *   ↓
     * Resource definition
     *   ↓
     * Database operation
     */

    return executeResourceAction(

        resource,

        operation,

        resolvedActionConfig,

        runtimeContext

    );

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    executeUniversalAction,

    executeResourceAction,

    resolveOperation,

    resolveValue,

    resolveObject,

    getPath

};
