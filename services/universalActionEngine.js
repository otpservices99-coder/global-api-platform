const resourceService =
    require("./resourceService");

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
// Action
//   ↓
// Resource
//   ↓
// Operation
//   ↓
// ResourceService
//
// OR
//
// Action
//   ↓
// Registered Handler
//
// No project-specific action names.
// ============================================================================


// ============================================================================
// SENSITIVE RESULT FIELDS
// ============================================================================

const SENSITIVE_FIELDS = new Set([

    "password",
    "passwordHash",
    "hashedPassword",

    "token",
    "accessToken",
    "refreshToken",

    "apiKey",
    "api_key",

    "secret",
    "secretKey",

    "privateKey",
    "private_key",

    "jwt",

    "authorization",

    "otp",
    "otpCode",

    "securityAnswer",
    "securityQuestion",

    "clientSecret",
    "client_secret"
]);


// ============================================================================
// RESULT SANITIZATION
// ============================================================================

function sanitizeActionResult(value) {

    if (Array.isArray(value)) {

        return value.map(
            sanitizeActionResult
        );
    }


    if (
        value &&
        typeof value === "object"
    ) {

        const output = {};


        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                SENSITIVE_FIELDS.has(
                    key
                )
            ) {
                continue;
            }


            output[key] =
                sanitizeActionResult(
                    child
                );
        }


        return output;
    }


    return value;
}


// ============================================================================
// PATH RESOLUTION
// ============================================================================

function getPath(
    object,
    path
) {

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
            (
                current,
                key
            ) =>
                current == null
                    ? undefined
                    : current[key],
            object
        );
}


// ============================================================================
// TEMPLATE RESOLUTION
// ============================================================================

function resolveValue(
    value,
    context
) {

    if (
        typeof value !== "string"
    ) {
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
        (
            _,
            expression
        ) => {

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

        return Object.entries(
            value
        ).reduce(
            (
                output,
                [key, child]
            ) => {

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

function mergeObjects(
    ...objects
) {

    return objects.reduce(
        (
            output,
            object
        ) => {

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

                    output[key] =
                        value;
                }
            }


            return output;

        },
        {}
    );
}


// ============================================================================
// PLAIN OBJECT
// ============================================================================

function isPlainObject(
    value
) {

    return (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


// ============================================================================
// RESOURCE MODEL
// ============================================================================

function getModelFromResource(
    resourceDocument
) {

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

function getResourceIdCandidates(
    resource
) {

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

function hasValue(
    value
) {

    return (
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}


// ============================================================================
// RECORD ID
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
        const candidate
        of candidates
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
        of getResourceIdCandidates(
            resource
        )
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
// FILTER
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


    return isPlainObject(
        filter
    )
        ? filter
        : {};
}


// ============================================================================
// SCHEMA FILTER INFERENCE
// ============================================================================

function inferFilterFromData({
    resourceDocument,
    data = {},
    projectId
}) {

    if (
        !isPlainObject(data)
    ) {
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

                filter[fieldName] =
                    value;
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
// TARGET
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
        Object.keys(
            explicitFilter
        ).length > 0
    ) {

        return {

            id: null,

            filter:
                explicitFilter,

            source:
                "config.filter"
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
        Object.keys(
            inferredFilter
        ).length > 0
    ) {

        return {

            id: null,

            filter:
                inferredFilter,

            source:
                "schema.inference"
        };
    }


    return {

        id: null,

        filter: {},

        source: "none"
    };
}


// ============================================================================
// HANDLER LOADING
// ============================================================================

function ensureHandlersLoaded() {

    if (
        !handlerRegistry ||
        handlerRegistry.size === 0
    ) {
        loadHandlers();
    }
}


// ============================================================================
// HANDLER CHECK
// ============================================================================

function hasRegisteredHandler(
    name
) {

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


    const result =
        await executeHandler(
            name,
            context
        );


    if (
        result === undefined ||
        result === null
    ) {

        throw new Error(
            `Handler '${name}' returned no result`
        );
    }


    if (
        typeof result === "object" &&
        result.success === false
    ) {

        throw new Error(
            result.message ||
            `Handler '${name}' failed`
        );
    }


    return result;
}


// ============================================================================
// RESOURCE OPERATION RESOLUTION
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
// PING
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
// RESOURCE ACTION
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


    const resolved =
        await resolveOperation({

            projectId,

            resource,

            operation:
                requestedOperation,

            config,

            context
        });


    if (!resolved) {

        const actionName =
            context?.actionName ||
            context?.action?.name ||
            context?.action?.action ||
            context?.action?.key ||
            null;


        if (
            actionName &&
            hasRegisteredHandler(
                actionName
            )
        ) {

            return executeRegisteredHandler({

                name:
                    actionName,

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
    // OPERATION
    // ------------------------------------------------------------

    let result;


    switch (actualOperation) {

        // ========================================================
        // CREATE
        // ========================================================

        case "create":

            result =
                await resourceService.create({

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

            break;


        // ========================================================
        // FIND
        // ========================================================

        case "find":
        case "list":

            result =
                await resourceService.find({

                    projectId,

                    resource,

                    filter,

                    options:
                        actualConfig.options ||
                        {}
                });

            break;


        // ========================================================
        // FIND ONE
        // ========================================================

        case "findOne":
        case "get":
        case "view":

            result =
                await resourceService.findOne({

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

            break;


        // ========================================================
        // UPDATE
        // ========================================================

        case "update":

            result =
                await resourceService.update({

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

            break;


        // ========================================================
        // DELETE
        // ========================================================

        case "delete":
        case "remove":

            result =
                await resourceService.remove({

                    projectId,

                    resource,

                    id,

                    filter
                });

            break;


        // ========================================================
        // INCREMENT
        // ========================================================

        case "increment":

            result =
                await resourceService.increment({

                    projectId,

                    resource,

                    id,

                    filter,

                    field:
                        actualConfig.field,

                    amount:
                        actualConfig.amount
                });

            break;


        // ========================================================
        // DECREMENT
        // ========================================================

        case "decrement":

            result =
                await resourceService.decrement({

                    projectId,

                    resource,

                    id,

                    filter,

                    field:
                        actualConfig.field,

                    amount:
                        actualConfig.amount
                });

            break;


        // ========================================================
        // ADJUST
        // ========================================================

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


            result =
                await resourceService.atomicAdjust({

                    projectId,

                    resource,

                    id,

                    filter,

                    field:
                        actualConfig.field,

                    amount
                });

            break;
        }


        // ========================================================
        // SET
        // ========================================================

        case "set":

            result =
                await resourceService.update({

                    projectId,

                    resource,

                    id,

                    filter,

                    data:
                        actualConfig.data ||
                        {},

                    replace: false
                });

            break;


        // ========================================================
        // CREATE MANY
        // ========================================================

        case "createMany": {

            const records =
                Array.isArray(
                    actualConfig.data
                )
                    ? actualConfig.data
                    : [];


            const results = [];


            for (
                const record
                of records
            ) {

                const created =
                    await resourceService.create({

                        projectId,

                        resource,

                        data:
                            record,

                        metadata:
                            actualConfig.metadata ||
                            {}
                    });


                if (
                    !created ||
                    created.success === false
                ) {

                    throw new Error(
                        created?.message ||
                        "createMany operation failed"
                    );
                }


                results.push(
                    created
                );
            }


            result = {

                success: true,

                data:
                    results
            };

            break;
        }


        // ========================================================
        // UPDATE MANY
        // ========================================================

        case "updateMany": {

            const records =
                await resourceService.find({

                    projectId,

                    resource,

                    filter
                });


            if (
                !records ||
                records.success === false
            ) {

                throw new Error(
                    records?.message ||
                    "updateMany lookup failed"
                );
            }


            const results = [];


            for (
                const record
                of records.data || []
            ) {

                const updated =
                    await resourceService.update({

                        projectId,

                        resource,

                        id:
                            record._id,

                        data:
                            actualConfig.data ||
                            {},

                        replace: false
                    });


                if (
                    !updated ||
                    updated.success === false
                ) {

                    throw new Error(
                        updated?.message ||
                        "updateMany operation failed"
                    );
                }


                results.push(
                    updated
                );
            }


            result = {

                success: true,

                data:
                    results
            };

            break;
        }


        // ========================================================
        // DELETE MANY
        // ========================================================

        case "deleteMany": {

            const records =
                await resourceService.find({

                    projectId,

                    resource,

                    filter
                });


            if (
                !records ||
                records.success === false
            ) {

                throw new Error(
                    records?.message ||
                    "deleteMany lookup failed"
                );
            }


            const results = [];


            for (
                const record
                of records.data || []
            ) {

                const removed =
                    await resourceService.remove({

                        projectId,

                        resource,

                        id:
                            record._id
                    });


                if (
                    !removed ||
                    removed.success === false
                ) {

                    throw new Error(
                        removed?.message ||
                        "deleteMany operation failed"
                    );
                }


                results.push(
                    removed
                );
            }


            result = {

                success: true,

                data:
                    results
            };

            break;
        }


        // ========================================================
        // FANOUT
        // ========================================================

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


                const targetResult =
                    await executeResourceAction(

                        targetResource,

                        targetOperation,

                        targetConfig,

                        context
                    );


                if (
                    !targetResult ||
                    targetResult.success === false
                ) {

                    throw new Error(
                        targetResult?.message ||
                        `Fanout operation '${targetOperation}' failed`
                    );
                }


                results.push({

                    resource:
                        targetResource,

                    operation:
                        targetOperation,

                    result:
                        targetResult
                });
            }


            result = {

                success: true,

                data:
                    results
            };

            break;
        }


        // ========================================================
        // UNSUPPORTED
        // ========================================================

        default:

            throw new Error(
                `Unsupported resource operation '${actualOperation}'`
            );
    }


    // ============================================================
    // CRITICAL SUCCESS VALIDATION
    // ============================================================
    //
    // ResourceService methods return:
    //
    //   { success: true, ... }
    //
    // OR
    //
    //   { success: false, ... }
    //
    // A false result MUST NEVER reach the HTTP success response.
    // ============================================================

    if (
        result === undefined ||
        result === null
    ) {

        throw new Error(
            `Operation '${actualOperation}' returned no result`
        );
    }


    if (
        typeof result === "object" &&
        result.success === false
    ) {

        throw new Error(
            result.message ||
            `Operation '${actualOperation}' failed`
        );
    }


    return result;
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


    // ============================================================
    // MULTI-STEP ACTION
    // ============================================================

    const steps =
        Array.isArray(
            actionRecord.steps
        )
            ? actionRecord.steps
            : (
                Array.isArray(
                    actionRecord.config?.steps
                )
                    ? actionRecord.config.steps
                    : null
            );


    if (steps) {

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


            const stepResult =
                await executeResourceAction(

                    stepResource,

                    stepOperation,

                    stepConfig,

                    runtimeContext
                );


            if (
                !stepResult ||
                stepResult.success === false
            ) {

                throw new Error(
                    stepResult?.message ||
                    `Action step ${index} failed`
                );
            }


            results.push({

                resource:
                    stepResource,

                operation:
                    stepOperation,

                result:
                    stepResult
            });
        }


        return {

            success: true,

            action:
                actionName,

            results
        };
    }


    // ============================================================
    // CONFIGURATION
    // ============================================================

    const config =
        actionRecord.config &&
        typeof actionRecord.config === "object"
            ? actionRecord.config
            : actionRecord;


    // ============================================================
    // EXPLICIT HANDLER
    // ============================================================

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

        const result =
            await executeRegisteredHandler({

                name:
                    configuredHandler,

                context:
                    runtimeContext
            });


        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result?.message ||
                `Handler '${configuredHandler}' failed`
            );
        }


        return result;
    }


    // ============================================================
    // RESOURCE
    // ============================================================

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


    // ============================================================
    // RESOURCE EXECUTION
    // ============================================================

    if (
        resource &&
        operation
    ) {

        try {

            const result =
                await executeResourceAction(

                    resource,

                    operation,

                    config,

                    runtimeContext
                );


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    `Action '${actionName}' failed`
                );
            }


            return result;


        } catch (error) {

            // ----------------------------------------------------
            // GENERIC HANDLER FALLBACK
            // ----------------------------------------------------

            if (
                actionName &&
                hasRegisteredHandler(
                    actionName
                )
            ) {

                const result =
                    await executeRegisteredHandler({

                        name:
                            actionName,

                        context:
                            runtimeContext
                    });


                if (
                    !result ||
                    result.success === false
                ) {

                    throw new Error(
                        result?.message ||
                        `Action '${actionName}' failed`
                    );
                }


                return result;
            }


            throw error;
        }
    }


    // ============================================================
    // IMPLICIT HANDLER
    // ============================================================

    if (
        actionName &&
        hasRegisteredHandler(
            actionName
        )
    ) {

        const result =
            await executeRegisteredHandler({

                name:
                    actionName,

                context:
                    runtimeContext
            });


        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result?.message ||
                `Action '${actionName}' failed`
            );
        }


        return result;
    }


    // ============================================================
    // INVALID CONFIGURATION
    // ============================================================

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

    sanitizeActionResult
};
