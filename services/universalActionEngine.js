// ============================================================================
// UNIVERSAL ACTION ENGINE
// ============================================================================
//
// Global, reusable, database-driven action execution.
//
// Architecture:
//
// Action
//   ↓
// Action configuration
//   ↓
// Resource + Operation
//   ↓
// ResourceService
//   ↓
// Real database operation
//   ↓
// Validate result
//   ↓
// Sanitize result
//   ↓
// Return success/failure
//
// IMPORTANT:
// - Configured resource operations are authoritative.
// - A failed resource operation MUST NOT fall back to a handler.
// - An operation returning success:false MUST become a failed action.
// - An operation returning no result MUST become a failed action.
// - "success:true" is only returned after real execution succeeds.
// - No project-specific action names are hard-coded.
// ============================================================================

const resourceService =
    require("./resourceService");

const handlers =
    require("../handlers");


// ============================================================================
// HANDLER HELPERS
// ============================================================================

function getHandlerExecutor() {

    if (
        handlers &&
        typeof handlers.execute === "function"
    ) {
        return handlers.execute;
    }

    return null;
}


function hasRegisteredHandler(
    name
) {

    if (!name) {
        return false;
    }

    if (
        handlers &&
        typeof handlers.has === "function"
    ) {
        return handlers.has(name);
    }

    if (
        handlers &&
        handlers.registry &&
        typeof handlers.registry.has === "function"
    ) {
        return handlers.registry.has(name);
    }

    return false;
}


async function executeRegisteredHandler({
    name,
    context = {}
}) {

    if (!name) {
        throw new Error(
            "Handler name is required"
        );
    }

    const executeHandler =
        getHandlerExecutor();

    if (!executeHandler) {
        throw new Error(
            "Handler executor is not available"
        );
    }

    if (
        !hasRegisteredHandler(name)
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
            result.error ||
            `Handler '${name}' failed`
        );
    }

    return result;
}


// ============================================================================
// PATH RESOLUTION
// ============================================================================

function getPath(
    object,
    path
) {

    if (
        object === undefined ||
        object === null ||
        !path
    ) {
        return undefined;
    }

    const parts =
        String(path)
            .split(".")
            .filter(Boolean);

    let current =
        object;

    for (
        const part
        of parts
    ) {

        if (
            current === undefined ||
            current === null
        ) {
            return undefined;
        }

        current =
            current[part];
    }

    return current;
}


// ============================================================================
// TEMPLATE VALUE RESOLUTION
// ============================================================================

function resolveValue(
    value,
    context = {}
) {

    if (
        typeof value !== "string"
    ) {
        return value;
    }

    const exact =
        value.match(
            /^\{\{\s*([^}]+?)\s*\}\}$/
        );

    // Preserve original data type for exact templates.
    //
    // Example:
    //
    // "{{ data.user }}"
    //
    // returns the actual ObjectId/string/value,
    // not a stringified representation.
    if (exact) {

        const resolved =
            getPath(
                context,
                exact[1].trim()
            );

        return resolved;
    }

    // Resolve embedded templates as strings.
    return value.replace(
        /\{\{\s*([^}]+?)\s*\}\}/g,
        (
            match,
            path
        ) => {

            const resolved =
                getPath(
                    context,
                    path.trim()
                );

            if (
                resolved === undefined ||
                resolved === null
            ) {
                return "";
            }

            if (
                typeof resolved === "object"
            ) {
                try {
                    return JSON.stringify(
                        resolved
                    );
                } catch {
                    return String(
                        resolved
                    );
                }
            }

            return String(
                resolved
            );
        }
    );
}


// ============================================================================
// OBJECT RESOLUTION
// ============================================================================

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
            const [key, item]
            of Object.entries(value)
        ) {

            output[key] =
                resolveObject(
                    item,
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
// RESOURCE MODEL
// ============================================================================

function getModelFromResource(
    resourceDocument
) {

    try {

        if (
            !resourceService ||
            typeof resourceService.resolveModel !==
                "function"
        ) {
            return null;
        }

        return resourceService.resolveModel(
            resourceDocument
        );

    } catch (
        error
    ) {

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
// RECORD ID RESOLUTION
// ============================================================================

function resolveRecordId(
    config,
    context,
    resource = null
) {

    const candidates = [

        config?.id,

        config?._id,

        config?.recordId,

        config?.record_id
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

        if (
            hasValue(value)
        ) {
            return value;
        }
    }


    // Direct common request IDs.
    const directPaths = [

        "data.id",

        "data._id",

        "data.userId",

        "data.user_id",

        "data.recordId",

        "data.record_id"
    ];

    for (
        const path
        of directPaths
    ) {

        const value =
            getPath(
                context,
                path
            );

        if (
            hasValue(value)
        ) {
            return value;
        }
    }


    // Resource-specific ID convention.
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

        if (
            hasValue(value)
        ) {
            return value;
        }
    }


    // Generic user field is useful when
    // a resource itself represents users.
    if (
        resource === "user" ||
        resource === "users"
    ) {

        const user =
            getPath(
                context,
                "data.user"
            );

        if (
            hasValue(user)
        ) {
            return user;
        }
    }

    return null;
}


// ============================================================================
// FILTER RESOLUTION
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
//
// Used only when an explicit ID/filter was not supplied.
//
// This allows generic actions to infer a lookup from fields
// that actually exist in the resource schema.
//
// ============================================================================

function inferFilterFromData({
    resourceDocument,
    data = {}
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

    if (
        !Model?.schema
    ) {
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

            if (
                hasValue(value)
            ) {
                filter[fieldName] =
                    value;
            }
        }
    }


    // Project is always controlled by the engine.
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
    context
}) {

    // ------------------------------------------------------------
    // 1. Explicit ID
    // ------------------------------------------------------------

    const id =
        resolveRecordId(
            config,
            context,
            resource
        );

    if (
        hasValue(id)
    ) {

        return {

            id,

            filter: {},

            source:
                "id"
        };
    }


    // ------------------------------------------------------------
    // 2. Explicit filter
    // ------------------------------------------------------------

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


    // ------------------------------------------------------------
    // 3. Schema inference
    // ------------------------------------------------------------

    const inferredFilter =
        inferFilterFromData({

            resourceDocument,

            data:
                context?.data || {}
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

        source:
            "none"
    };
}


// ============================================================================
// RESULT SUCCESS VALIDATION
// ============================================================================
//
// This is the critical gate.
//
// Nothing is considered successful unless:
//   - a result exists
//   - result.success === true
//
// This prevents:
//   { success:false }
//   or undefined/null
// from becoming an HTTP 200 success.
//
// ============================================================================

function assertSuccessfulResult(
    result,
    operationName
) {

    if (
        result === undefined ||
        result === null
    ) {

        throw new Error(
            `Operation '${operationName}' returned no result`
        );
    }

    if (
        typeof result !== "object"
    ) {

        throw new Error(
            `Operation '${operationName}' returned an invalid result`
        );
    }

    if (
        result.success !== true
    ) {

        throw new Error(
            result.message ||
            result.error ||
            `Operation '${operationName}' failed`
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

    if (
        !projectId
    ) {
        return null;
    }

    if (
        !resource
    ) {
        return null;
    }

    if (
        !operation
    ) {
        return null;
    }

    const resourceDocument =
        await resourceService.getResource({

            projectId,

            resource
        });

    if (
        !resourceDocument
    ) {
        return null;
    }

    const operations =
        resourceDocument
            ?.settings
            ?.operations || {};

    const definition =
        operations[operation];

    if (
        !definition
    ) {
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

    if (
        !projectId
    ) {
        throw new Error(
            "Project ID is required"
        );
    }

    if (
        !resource
    ) {
        throw new Error(
            "Resource is required"
        );
    }

    if (
        !operation
    ) {
        throw new Error(
            "Operation is required"
        );
    }


    const requestedOperation =
        String(
            operation
        ).trim();

    if (
        !requestedOperation
    ) {
        throw new Error(
            "Operation is required"
        );
    }


    // ------------------------------------------------------------
    // Resolve the operation from the resource definition.
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
    // If a resource operation was explicitly requested but is
    // not configured, DO NOT silently execute a handler.
    //
    // The caller asked for a real resource operation.
    // Failure to resolve that operation is a real failure.
    // ------------------------------------------------------------

    if (
        !resolved
    ) {

        throw new Error(
            `Operation '${requestedOperation}' is not configured for resource '${resource}'`
        );
    }


    const actualOperation =
        String(
            resolved.operation ||
            requestedOperation
        );


    const actualConfig =
        resolved.config || {};


    // ------------------------------------------------------------
    // PING / HEALTH
    // ------------------------------------------------------------

    if (
        actualOperation === "ping" ||
        actualOperation === "health" ||
        requestedOperation === "ping" ||
        requestedOperation === "health"
    ) {

        return assertSuccessfulResult(

            executePing({

                projectId,

                resource,

                resolved,

                operation:
                    actualOperation
            }),

            actualOperation
        );
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

            context
        });


    const id =
        target.id;

    const filter =
        target.filter;


    // ------------------------------------------------------------
    // EXECUTION
    // ------------------------------------------------------------

    let result;


    switch (
        actualOperation
    ) {

        // ========================================================
        // CREATE
        // ========================================================

        case "create": {

            const createData =
                actualConfig.data !== undefined
                    ? actualConfig.data
                    : (
                        context.data || {}
                    );

            result =
                await resourceService.create({

                    projectId,

                    resource,

                    data:
                        createData,

                    metadata:
                        actualConfig.metadata ||
                        {}
                });

            break;
        }


        // ========================================================
        // FIND / LIST
        // ========================================================

        case "find":
        case "list": {

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
        }


        // ========================================================
        // FIND ONE / GET / VIEW
        // ========================================================

        case "findOne":
        case "get":
        case "view": {

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
        }


        // ========================================================
        // UPDATE
        // ========================================================

        case "update": {

            const updateData =
                actualConfig.data !== undefined
                    ? actualConfig.data
                    : {};

            if (
                !isPlainObject(updateData)
            ) {

                throw new Error(
                    "Update data must be an object"
                );
            }

            result =
                await resourceService.update({

                    projectId,

                    resource,

                    id,

                    filter,

                    data:
                        updateData,

                    replace:
                        actualConfig.replace === true
                });

            break;
        }


        // ========================================================
        // DELETE / REMOVE
        // ========================================================

        case "delete":
        case "remove": {

            result =
                await resourceService.remove({

                    projectId,

                    resource,

                    id,

                    filter
                });

            break;
        }


        // ========================================================
        // INCREMENT
        // ========================================================

        case "increment": {

            const amount =
                resolveValue(
                    actualConfig.amount,
                    context
                );

            const field =
                resolveValue(
                    actualConfig.field,
                    context
                );

            if (
                !field
            ) {
                throw new Error(
                    "Increment field is required"
                );
            }

            result =
                await resourceService.increment({

                    projectId,

                    resource,

                    id,

                    filter,

                    field,

                    amount
                });

            break;
        }


        // ========================================================
        // DECREMENT
        // ========================================================

        case "decrement": {

            const amount =
                resolveValue(
                    actualConfig.amount,
                    context
                );

            const field =
                resolveValue(
                    actualConfig.field,
                    context
                );

            if (
                !field
            ) {
                throw new Error(
                    "Decrement field is required"
                );
            }

            result =
                await resourceService.decrement({

                    projectId,

                    resource,

                    id,

                    filter,

                    field,

                    amount
                });

            break;
        }


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

            const field =
                resolveValue(
                    actualConfig.field,
                    context
                );

            if (
                !field
            ) {
                throw new Error(
                    "Adjustment field is required"
                );
            }

            result =
                await resourceService.atomicAdjust({

                    projectId,

                    resource,

                    id,

                    filter,

                    field,

                    amount
                });

            break;
        }


        // ========================================================
        // SET
        // ========================================================

        case "set": {

            const setData =
                actualConfig.data !== undefined
                    ? actualConfig.data
                    : {};

            if (
                !isPlainObject(setData)
            ) {
                throw new Error(
                    "Set data must be an object"
                );
            }

            result =
                await resourceService.update({

                    projectId,

                    resource,

                    id,

                    filter,

                    data:
                        setData,

                    replace: false
                });

            break;
        }


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

            if (
                records.length === 0
            ) {
                throw new Error(
                    "createMany requires a non-empty data array"
                );
            }

            const results = [];

            for (
                let index = 0;
                index < records.length;
                index++
            ) {

                const created =
                    await resourceService.create({

                        projectId,

                        resource,

                        data:
                            records[index],

                        metadata:
                            actualConfig.metadata ||
                            {}
                    });

                assertSuccessfulResult(
                    created,
                    `createMany[${index}]`
                );

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

                    filter,

                    options:
                        actualConfig.options ||
                        {}
                });

            assertSuccessfulResult(
                records,
                "updateMany lookup"
            );

            const results = [];

            for (
                let index = 0;
                index <
                (
                    Array.isArray(records.data)
                        ? records.data.length
                        : 0
                );
                index++
            ) {

                const record =
                    records.data[index];

                const recordId =
                    record?._id ||
                    record?.id;

                if (
                    !recordId
                ) {
                    throw new Error(
                        `updateMany record ${index} has no ID`
                    );
                }

                const updated =
                    await resourceService.update({

                        projectId,

                        resource,

                        id:
                            recordId,

                        data:
                            actualConfig.data ||
                            {},

                        replace:
                            actualConfig.replace === true
                    });

                assertSuccessfulResult(
                    updated,
                    `updateMany[${index}]`
                );

                results.push(
                    updated
                );
            }

            result = {

                success: true,

                data:
                    results,

                count:
                    results.length
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

                    filter,

                    options:
                        actualConfig.options ||
                        {}
                });

            assertSuccessfulResult(
                records,
                "deleteMany lookup"
            );

            const results = [];

            for (
                let index = 0;
                index <
                (
                    Array.isArray(records.data)
                        ? records.data.length
                        : 0
                );
                index++
            ) {

                const record =
                    records.data[index];

                const recordId =
                    record?._id ||
                    record?.id;

                if (
                    !recordId
                ) {
                    throw new Error(
                        `deleteMany record ${index} has no ID`
                    );
                }

                const removed =
                    await resourceService.remove({

                        projectId,

                        resource,

                        id:
                            recordId
                    });

                assertSuccessfulResult(
                    removed,
                    `deleteMany[${index}]`
                );

                results.push(
                    removed
                );
            }

            result = {

                success: true,

                data:
                    results,

                count:
                    results.length
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

            if (
                targets.length === 0
            ) {
                throw new Error(
                    "Fanout requires at least one target"
                );
            }

            const results = [];

            for (
                let index = 0;
                index < targets.length;
                index++
            ) {

                const target =
                    targets[index];

                if (
                    !target ||
                    typeof target !== "object"
                ) {
                    throw new Error(
                        `Invalid fanout target at index ${index}`
                    );
                }

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

                if (
                    !targetResource
                ) {
                    throw new Error(
                        `Fanout target ${index} requires a resource`
                    );
                }

                if (
                    !targetOperation
                ) {
                    throw new Error(
                        `Fanout target ${index} requires an operation`
                    );
                }

                const targetResult =
                    await executeResourceAction(

                        targetResource,

                        targetOperation,

                        targetConfig,

                        context
                    );

                assertSuccessfulResult(
                    targetResult,
                    `fanout[${index}] ${targetResource}.${targetOperation}`
                );

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
    // FINAL EXECUTION GATE
    // ============================================================
    //
    // This is deliberately AFTER the real ResourceService call.
    //
    // A database/service operation is not successful merely
    // because no JavaScript exception was thrown.
    //
    // ResourceService must explicitly report:
    //
    //     { success: true }
    //
    // Otherwise the action fails.
    // ============================================================

    return assertSuccessfulResult(
        result,
        `${resource}.${actualOperation}`
    );
}


// ============================================================================
// UNIVERSAL ACTION EXECUTION
// ============================================================================

async function executeUniversalAction({
    actionRecord,
    projectId,
    actorId = null,
    userId = null,
    data = {},
    req = null
}) {

    if (
        !actionRecord
    ) {
        throw new Error(
            "Action record is required"
        );
    }

    if (
        !projectId
    ) {
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


    if (
        steps
    ) {

        if (
            steps.length === 0
        ) {
            throw new Error(
                `Action '${actionName}' contains no executable steps`
            );
        }

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

            if (
                !stepResource
            ) {
                throw new Error(
                    `Action step ${index} requires a resource`
                );
            }

            if (
                !stepOperation
            ) {
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

            assertSuccessfulResult(
                stepResult,
                `action step ${index}`
            );

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
    // ACTION CONFIGURATION
    // ============================================================

    const config =
        actionRecord.config &&
        typeof actionRecord.config === "object"
            ? actionRecord.config
            : actionRecord;


    // ============================================================
    // EXPLICIT HANDLER
    // ============================================================
    //
    // A handler is only used when the action explicitly declares
    // one. This is intentional.
    //
    // It is NOT used as a fallback for failed resource operations.
    // ============================================================

    const configuredHandler =
        resolveValue(
            config.handler,
            runtimeContext
        );


    if (
        configuredHandler
    ) {

        const result =
            await executeRegisteredHandler({

                name:
                    configuredHandler,

                context:
                    runtimeContext
            });

        return assertSuccessfulResult(
            result,
            `handler '${configuredHandler}'`
        );
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
    //
    // IMPORTANT:
    //
    // Once an action declares:
    //
    //     resource
    //     operation
    //
    // this is the authoritative execution path.
    //
    // There is NO handler fallback if it fails.
    //
    // This prevents a failed database operation from being
    // incorrectly reported as a successful action because some
    // registered handler happened to exist.
    // ============================================================

    if (
        resource ||
        operation
    ) {

        if (
            !resource
        ) {
            throw new Error(
                `Action '${actionName || "unknown"}' requires a resource`
            );
        }

        if (
            !operation
        ) {
            throw new Error(
                `Action '${actionName || "unknown"}' requires an operation`
            );
        }

        const result =
            await executeResourceAction(

                resource,

                operation,

                config,

                runtimeContext
            );

        return assertSuccessfulResult(
            result,
            `action '${actionName || "unknown"}'`
        );
    }


    // ============================================================
    // IMPLICIT HANDLER
    // ============================================================
    //
    // Only use the action name as a handler when the action has
    // NO resource/operation configuration at all.
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

        return assertSuccessfulResult(
            result,
            `handler '${actionName}'`
        );
    }


    // ============================================================
    // INVALID ACTION
    // ============================================================

    throw new Error(
        `Action '${actionName || "unknown"}' has no executable configuration`
    );
}


// ============================================================================
// SENSITIVE DATA SANITIZATION
// ============================================================================
//
// Passwords and other credentials must never be sent through the API response.
//
// This does NOT affect the actual database operation.
// It only sanitizes the returned response object.
//
// ============================================================================

const SENSITIVE_FIELDS = new Set([

    "password",

    "passwordHash",

    "currentPassword",

    "newPassword",

    "oldPassword",

    "confirmPassword",

    "token",

    "accessToken",

    "refreshToken",

    "apiKey",

    "secret",

    "secretKey",

    "privateKey",

    "encryptionKey"
]);


function sanitizeActionResult(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return value;
    }


    if (
        Array.isArray(value)
    ) {

        return value.map(
            item =>
                sanitizeActionResult(
                    item
                )
        );
    }


    if (
        typeof value !== "object"
    ) {
        return value;
    }


    // Mongoose documents.
    if (
        typeof value.toObject === "function"
    ) {

        try {

            return sanitizeActionResult(
                value.toObject()
            );

        } catch (
            error
        ) {
            // Continue with enumerable properties.
        }
    }


    const output = {};

    for (
        const [key, item]
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
                item
            );
    }

    return output;
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

    mergeObjects,

    resolveRecordId,

    resolveFilter,

    sanitizeActionResult,

    assertSuccessfulResult
};
