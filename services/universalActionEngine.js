const resourceService = require("./resourceService");
const {
    execute: executeHandler,
    registry: handlerRegistry,
    loadHandlers
} = require("../handlers");

// ============================================================================
// UNIVERSAL ACTION ENGINE
// ============================================================================
//
// GLOBAL / CONFIGURATION-DRIVEN EXECUTION
//
// Execution priority:
//
// 1. Explicitly configured Resource -> Operation
// 2. Registered generic Action Handler
// 3. Configuration error
//
// This engine contains NO project-specific action names.
//
// Examples:
//
// Resource action:
//
//   Action
//      ↓
//   Resource
//      ↓
//   Operation
//      ↓
//   ResourceService
//
// Handler action:
//
//   Action
//      ↓
//   Registered Handler
//
// Handler discovery is dynamic through handlers/index.js.
// ============================================================================


// ============================================================================
// PATH RESOLUTION
// ============================================================================

function getPath(object, path) {
    if (!path) {
        return undefined;
    }

    if (
        typeof path !== "string" ||
        !path.includes(".")
    ) {
        return object?.[path];
    }

    return path
        .split(".")
        .reduce(
            (current, key) =>
                current == null
                    ? undefined
                    : current[key],
            object
        );
}


// ============================================================================
// TEMPLATE RESOLUTION
// ============================================================================

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
        (_, expression) => {
            const resolved =
                getPath(
                    context,
                    expression.trim()
                );

            return resolved == null
                ? ""
                : String(resolved);
        }
    );
}


// ============================================================================
// OBJECT RESOLUTION
// ============================================================================

function resolveObject(value, context) {
    if (Array.isArray(value)) {
        return value.map(item =>
            resolveObject(item, context)
        );
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Object.entries(value).reduce(
            (output, [key, child]) => {
                output[key] =
                    resolveObject(
                        child,
                        context
                    );

                return output;
            },
            {}
        );
    }

    return resolveValue(
        value,
        context
    );
}


// ============================================================================
// OBJECT MERGE
// ============================================================================

function mergeObjects(...objects) {
    return objects.reduce(
        (output, object) => {
            if (
                !object ||
                typeof object !== "object" ||
                Array.isArray(object)
            ) {
                return output;
            }

            for (
                const [key, value]
                of Object.entries(object)
            ) {
                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value) &&
                    output[key] &&
                    typeof output[key] === "object" &&
                    !Array.isArray(output[key])
                ) {
                    output[key] =
                        mergeObjects(
                            output[key],
                            value
                        );
                } else {
                    output[key] = value;
                }
            }

            return output;
        },
        {}
    );
}


// ============================================================================
// SAFE OBJECT CHECK
// ============================================================================

function isPlainObject(value) {
    return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


// ============================================================================
// RESOURCE MODEL INFORMATION
// ============================================================================

function getModelFromResource(resourceDocument) {
    try {
        return resourceService.resolveModel(
            resourceDocument
        );
    } catch (error) {
        return null;
    }
}


// ============================================================================
// RESOURCE ID CANDIDATES
// ============================================================================

function getResourceIdCandidates(resource) {
    if (
        !resource ||
        typeof resource !== "string"
    ) {
        return [];
    }

    const clean =
        resource.trim();

    if (!clean) {
        return [];
    }

    return [
        `${clean}Id`,
        `${clean}ID`,
        `${clean}_id`
    ];
}


// ============================================================================
// VALUE PRESENCE
// ============================================================================

function hasValue(value) {
    return (
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}


// ============================================================================
// EXPLICIT RECORD ID
// ============================================================================

function resolveRecordId(
    config,
    context,
    resource = null
) {
    const candidates = [
        config?.id,
        config?._id
    ];

    for (
        const candidate of candidates
    ) {
        const value =
            resolveValue(
                candidate,
                context
            );

        if (hasValue(value)) {
            return value;
        }
    }

    const requestId =
        getPath(
            context,
            "data.id"
        );

    if (hasValue(requestId)) {
        return requestId;
    }

    for (
        const key
        of getResourceIdCandidates(resource)
    ) {
        const value =
            getPath(
                context,
                `data.${key}`
            );

        if (hasValue(value)) {
            return value;
        }
    }

    return null;
}


// ============================================================================
// EXPLICIT FILTER
// ============================================================================

function resolveFilter(
    config,
    context
) {
    const filter =
        resolveObject(
            config?.filter || {},
            context
        );

    return isPlainObject(filter)
        ? filter
        : {};
}


// ============================================================================
// GENERIC SCHEMA FILTER INFERENCE
// ============================================================================

function inferFilterFromData({
    resourceDocument,
    data = {},
    projectId
}) {
    if (!isPlainObject(data)) {
        return {};
    }

    const resolvedModel =
        getModelFromResource(
            resourceDocument
        );

    if (!resolvedModel) {
        return {};
    }

    const Model =
        resolvedModel.Model;

    if (!Model?.schema) {
        return {};
    }

    const filter = {};

    const schemaPaths =
        Model.schema.paths || {};

    for (
        const fieldName
        of Object.keys(schemaPaths)
    ) {
        if (
            fieldName === "_id" ||
            fieldName === "__v"
        ) {
            continue;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                fieldName
            )
        ) {
            const value =
                data[fieldName];

            if (hasValue(value)) {
                filter[fieldName] = value;
            }
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            schemaPaths,
            "project"
        )
    ) {
        delete filter.project;
    }

    return filter;
}


// ============================================================================
// TARGET RESOLUTION
// ============================================================================

function resolveTarget({
    resourceDocument,
    resource,
    config,
    context,
    projectId
}) {
    const id =
        resolveRecordId(
            config,
            context,
            resource
        );

    if (hasValue(id)) {
        return {
            id,
            filter: {},
            source: "id"
        };
    }

    const explicitFilter =
        resolveFilter(
            config,
            context
        );

    if (
        Object.keys(explicitFilter).length > 0
    ) {
        return {
            id: null,
            filter: explicitFilter,
            source: "config.filter"
        };
    }

    const inferredFilter =
        inferFilterFromData({
            resourceDocument,
            data:
                context?.data || {},
            projectId
        });

    if (
        Object.keys(inferredFilter).length > 0
    ) {
        return {
            id: null,
            filter: inferredFilter,
            source: "schema.inference"
        };
    }

    return {
        id: null,
        filter: {},
        source: "none"
    };
}


// ============================================================================
// HANDLER AVAILABILITY
// ============================================================================
//
// Handlers are discovered dynamically.
//
// There is deliberately NO list of action names here.
//
// Example:
//
// handlers/withdrawal/approve.js
//     name: "withdrawal.approve"
//
// automatically becomes available through the handler registry.
// ============================================================================

function ensureHandlersLoaded() {
    if (
        !handlerRegistry ||
        handlerRegistry.size === 0
    ) {
        loadHandlers();
    }
}


function hasRegisteredHandler(name) {
    if (!name) {
        return false;
    }

    ensureHandlersLoaded();

    return handlerRegistry.has(
        name
    );
}


// ============================================================================
// HANDLER EXECUTION
// ============================================================================

async function executeRegisteredHandler({
    name,
    context = {}
}) {
    if (!name) {
        throw new Error(
            "Handler name is required"
        );
    }

    ensureHandlersLoaded();

    if (
        !handlerRegistry.has(name)
    ) {
        throw new Error(
            `Handler '${name}' is not registered`
        );
    }

    return executeHandler(
        name,
        context
    );
}


// ============================================================================
// RESOURCE OPERATION DEFINITION
// ============================================================================
//
// Returns null when the resource or operation is not configured.
//
// This is important because a missing Resource operation may legitimately
// mean that the Action is implemented by a registered handler.
//
// We therefore do NOT immediately throw here.
// ============================================================================

async function resolveOperation({
    projectId,
    resource,
    operation,
    config = {},
    context = {}
}) {
    const resourceDocument =
        await resourceService.getResource({
            projectId,
            resource
        });

    if (!resourceDocument) {
        return null;
    }

    const operations =
        resourceDocument
            ?.settings
            ?.operations || {};

    const definition =
        operations[operation];

    if (!definition) {
        return null;
    }

    const resolvedDefinition =
        resolveObject(
            definition,
            context
        );

    const resolvedConfig =
        resolveObject(
            config,
            context
        );

    return {
        resourceDocument,

        operation:
            resolvedDefinition.operation ||
            operation,

        config:
            mergeObjects(
                resolvedDefinition,
                resolvedConfig
            )
    };
}


// ============================================================================
// PING / HEALTH
// ============================================================================

function executePing({
    projectId,
    resource,
    resolved,
    operation = "ping"
}) {
    return {
        success: true,

        operation,

        resource,

        projectId,

        provider:
            resolved
                ?.resourceDocument
                ?.settings
                ?.provider ||
            "resourceData",

        model:
            resolved
                ?.resourceDocument
                ?.settings
                ?.model ||
            null,

        message:
            "Resource operation is available"
    };
}


// ============================================================================
// UNIVERSAL RESOURCE ACTION
// ============================================================================

async function executeResourceAction(
    resource,
    operation,
    config = {},
    context = {}
) {
    const projectId =
        context.projectId;

    if (!projectId) {
        throw new Error(
            "Project ID is required"
        );
    }

    if (!resource) {
        throw new Error(
            "Resource is required"
        );
    }

    if (!operation) {
        throw new Error(
            "Operation is required"
        );
    }

    const requestedOperation =
        String(operation);

    // ------------------------------------------------------------
    // Resolve the configured Resource operation.
    // ------------------------------------------------------------

    const resolved =
        await resolveOperation({
            projectId,
            resource,
            operation:
                requestedOperation,
            config,
            context
        });

    // ------------------------------------------------------------
    // IMPORTANT:
    //
    // A resource operation that does not exist is NOT automatically
    // an error.
    //
    // The caller may be using a registered handler.
    // ------------------------------------------------------------

    if (!resolved) {
        const actionName =
            context?.actionName ||
            context?.action?.name ||
            context?.action?.action ||
            context?.action?.key ||
            null;

        if (
            actionName &&
            hasRegisteredHandler(actionName)
        ) {
            return executeRegisteredHandler({
                name: actionName,
                context
            });
        }

        throw new Error(
            `Operation '${requestedOperation}' is not configured for resource '${resource}'`
        );
    }

    const actualOperation =
        resolved.operation;

    const actualConfig =
        resolved.config;

    // ------------------------------------------------------------
    // PING / HEALTH
    // ------------------------------------------------------------

    if (
        requestedOperation === "ping" ||
        requestedOperation === "health"
    ) {
        return executePing({
            projectId,
            resource,
            resolved,
            operation:
                requestedOperation
        });
    }

    // ------------------------------------------------------------
    // TARGET
    // ------------------------------------------------------------

    const target =
        resolveTarget({
            resourceDocument:
                resolved.resourceDocument,

            resource,

            config:
                actualConfig,

            context,

            projectId
        });

    const id =
        target.id;

    const filter =
        target.filter;

    // ------------------------------------------------------------
    // CREATE
    // ------------------------------------------------------------

    switch (actualOperation) {

        case "create":

            return resourceService.create({
                projectId,
                resource,

                data:
                    actualConfig.data !==
                    undefined
                        ? actualConfig.data
                        : context.data || {},

                metadata:
                    actualConfig.metadata ||
                    {}
            });


        // --------------------------------------------------------
        // FIND
        // --------------------------------------------------------

        case "find":
        case "list":

            return resourceService.find({
                projectId,
                resource,
                filter,

                options:
                    actualConfig.options ||
                    {}
            });


        // --------------------------------------------------------
        // FIND ONE
        // --------------------------------------------------------

        case "findOne":
        case "get":
        case "view":

            return resourceService.findOne({
                projectId,
                resource,
                id,
                filter,

                allowEmptyFilter:
                    actualConfig.allowEmptyFilter === true,

                options:
                    actualConfig.options ||
                    {}
            });


        // --------------------------------------------------------
        // UPDATE
        // --------------------------------------------------------

        case "update":

            return resourceService.update({
                projectId,
                resource,
                id,
                filter,

                data:
                    actualConfig.data ||
                    {},

                replace:
                    actualConfig.replace === true
            });


        // --------------------------------------------------------
        // DELETE
        // --------------------------------------------------------

        case "delete":
        case "remove":

            return resourceService.remove({
                projectId,
                resource,
                id,
                filter
            });


        // --------------------------------------------------------
        // INCREMENT
        // --------------------------------------------------------

        case "increment":

            return resourceService.increment({
                projectId,
                resource,
                id,
                filter,

                field:
                    actualConfig.field,

                amount:
                    actualConfig.amount
            });


        // --------------------------------------------------------
        // DECREMENT
        // --------------------------------------------------------

        case "decrement":

            return resourceService.decrement({
                projectId,
                resource,
                id,
                filter,

                field:
                    actualConfig.field,

                amount:
                    actualConfig.amount
            });


        // --------------------------------------------------------
        // ADJUST
        // --------------------------------------------------------

        case "adjust": {

            const amount =
                Number(
                    resolveValue(
                        actualConfig.amount,
                        context
                    )
                );

            if (
                !Number.isFinite(amount)
            ) {
                throw new Error(
                    "Invalid adjustment amount"
                );
            }

            return resourceService.atomicAdjust({
                projectId,
                resource,
                id,
                filter,

                field:
                    actualConfig.field,

                amount
            });
        }


        // --------------------------------------------------------
        // SET
        // --------------------------------------------------------

        case "set":

            return resourceService.update({
                projectId,
                resource,
                id,
                filter,

                data:
                    actualConfig.data ||
                    {},

                replace: false
            });


        // --------------------------------------------------------
        // CREATE MANY
        // --------------------------------------------------------

        case "createMany": {

            const records =
                Array.isArray(
                    actualConfig.data
                )
                    ? actualConfig.data
                    : [];

            const results = [];

            for (
                const record of records
            ) {
                results.push(
                    await resourceService.create({
                        projectId,
                        resource,

                        data:
                            record,

                        metadata:
                            actualConfig.metadata ||
                            {}
                    })
                );
            }

            return {
                success: true,
                data: results
            };
        }


        // --------------------------------------------------------
        // UPDATE MANY
        // --------------------------------------------------------

        case "updateMany": {

            const records =
                await resourceService.find({
                    projectId,
                    resource,
                    filter
                });

            if (!records.success) {
                return records;
            }

            const results = [];

            for (
                const record
                of records.data || []
            ) {
                results.push(
                    await resourceService.update({
                        projectId,
                        resource,

                        id:
                            record._id,

                        data:
                            actualConfig.data ||
                            {},

                        replace: false
                    })
                );
            }

            return {
                success: true,
                data: results
            };
        }


        // --------------------------------------------------------
        // DELETE MANY
        // --------------------------------------------------------

        case "deleteMany": {

            const records =
                await resourceService.find({
                    projectId,
                    resource,
                    filter
                });

            if (!records.success) {
                return records;
            }

            const results = [];

            for (
                const record
                of records.data || []
            ) {
                results.push(
                    await resourceService.remove({
                        projectId,
                        resource,

                        id:
                            record._id
                    })
                );
            }

            return {
                success: true,
                data: results
            };
        }


        // --------------------------------------------------------
        // FANOUT
        // --------------------------------------------------------

        case "fanout": {

            const targets =
                Array.isArray(
                    actualConfig.targets
                )
                    ? actualConfig.targets
                    : [];

            const results = [];

            for (
                const target
                of targets
            ) {
                const targetResource =
                    resolveValue(
                        target.resource,
                        context
                    );

                const targetOperation =
                    resolveValue(
                        target.operation,
                        context
                    );

                const targetConfig =
                    resolveObject(
                        target.config || {},
                        context
                    );

                results.push({
                    resource:
                        targetResource,

                    operation:
                        targetOperation,

                    result:
                        await executeResourceAction(
                            targetResource,
                            targetOperation,
                            targetConfig,
                            context
                        )
                });
            }

            return {
                success: true,
                data: results
            };
        }


        // --------------------------------------------------------
        // UNSUPPORTED
        // --------------------------------------------------------

        default:

            throw new Error(
                `Unsupported resource operation '${actualOperation}'`
            );
    }
}


// ============================================================================
// UNIVERSAL ACTION
// ============================================================================

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
            "Action record is required"
        );
    }

    if (!projectId) {
        throw new Error(
            "Project ID is required"
        );
    }

    const actionName =
        actionRecord.name ||
        actionRecord.action ||
        actionRecord.key ||
        null;

    const runtimeContext = {
        projectId,
        actorId,
        userId,
        data,
        req,

        action:
            actionRecord,

        actionName
    };

    // ========================================================================
    // MULTI-STEP ACTION
    // ========================================================================

    if (
        Array.isArray(
            actionRecord.steps
        ) ||
        Array.isArray(
            actionRecord.config?.steps
        )
    ) {
        const steps =
            Array.isArray(
                actionRecord.steps
            )
                ? actionRecord.steps
                : actionRecord.config.steps;

        const results = [];

        for (
            let index = 0;
            index < steps.length;
            index++
        ) {
            const step =
                steps[index];

            if (
                !step ||
                typeof step !== "object"
            ) {
                throw new Error(
                    `Invalid action step at index ${index}`
                );
            }

            const stepResource =
                resolveValue(
                    step.resource,
                    runtimeContext
                );

            const stepOperation =
                resolveValue(
                    step.operation,
                    runtimeContext
                );

            const stepConfig =
                resolveObject(
                    step.config ||
                    step,
                    runtimeContext
                );

            if (!stepResource) {
                throw new Error(
                    `Action step ${index} requires a resource`
                );
            }

            if (!stepOperation) {
                throw new Error(
                    `Action step ${index} requires an operation`
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


    // ========================================================================
    // NORMAL ACTION CONFIGURATION
    // ========================================================================

    const config =
        actionRecord.config &&
        typeof actionRecord.config === "object"
            ? actionRecord.config
            : actionRecord;


    // ========================================================================
    // EXPLICIT HANDLER CONFIGURATION
    // ========================================================================
    //
    // If an action explicitly names a handler, that handler is authoritative.
    //
    // Example:
    //
    // {
    //   "name": "some.action",
    //   "config": {
    //      "handler": "some.action"
    //   }
    // }
    //
    // No action-specific engine logic is required.
    // ========================================================================

    const configuredHandler =
        resolveValue(
            config.handler,
            runtimeContext
        );

    if (
        configuredHandler &&
        hasRegisteredHandler(
            configuredHandler
        )
    ) {
        return executeRegisteredHandler({
            name:
                configuredHandler,

            context:
                runtimeContext
        });
    }


    // ========================================================================
    // RESOURCE CONFIGURATION
    // ========================================================================

    const resource =
        resolveValue(
            config.resource,
            runtimeContext
        );

    const operation =
        resolveValue(
            config.operation,
            runtimeContext
        );


    // ========================================================================
    // RESOURCE ACTION
    // ========================================================================

    if (
        resource &&
        operation
    ) {
        try {
            return await executeResourceAction(
                resource,
                operation,
                config,
                runtimeContext
            );
        } catch (error) {

            // ------------------------------------------------------------
            // HANDLER FALLBACK
            // ------------------------------------------------------------
            //
            // A Resource + Operation may be present in the Action config
            // even when that operation is not configured on the Resource.
            //
            // If a registered handler exists for the Action itself, use
            // that handler.
            //
            // This is generic. There is no withdrawal-specific logic.
            // ------------------------------------------------------------

            if (
                actionName &&
                hasRegisteredHandler(
                    actionName
                )
            ) {
                return executeRegisteredHandler({
                    name:
                        actionName,

                    context:
                        runtimeContext
                });
            }

            throw error;
        }
    }


    // ========================================================================
    // IMPLICIT REGISTERED HANDLER
    // ========================================================================
    //
    // Backward compatibility:
    //
    // An Action can simply have a name matching a registered handler.
    //
    // No config.handler field is required.
    // ========================================================================

    if (
        actionName &&
        hasRegisteredHandler(
            actionName
        )
    ) {
        return executeRegisteredHandler({
            name:
                actionName,

            context:
                runtimeContext
        });
    }


    // ========================================================================
    // INVALID ACTION CONFIGURATION
    // ========================================================================

    if (!resource) {
        throw new Error(
            `Action '${actionName || "unknown"}' requires a resource or registered handler`
        );
    }

    if (!operation) {
        throw new Error(
            `Action '${actionName || "unknown"}' requires an operation or registered handler`
        );
    }

    throw new Error(
        `Action '${actionName || "unknown"}' has no executable configuration`
    );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    executeUniversalAction,

    executeResourceAction,

    resolveOperation,

    resolveValue,

    resolveObject,

    resolveRecordId,

    resolveFilter,

    resolveTarget,

    inferFilterFromData,

    getPath,

    mergeObjects,

    hasRegisteredHandler,

    executeRegisteredHandler
};
