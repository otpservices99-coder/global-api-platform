// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// Compatibility facade.
//
// Execution:
//
// Action
//   ↓
// Registered Handler OR Universal Action Engine
//   ↓
// Real Resource Operation
//   ↓
// Verify result
//   ↓
// Sanitize result
//
// No project-specific action names.
// ============================================================

const {
    executeUniversalAction,
    sanitizeActionResult
} = require("./universalActionEngine");

const {
    execute,
    has
} = require("../handlers");


// ============================================================
// ACTION NAME
// ============================================================

function getActionName(action) {

    return (
        action?.name ||
        action?.action ||
        action?.key ||
        null
    );
}


// ============================================================
// EXECUTION RESULT VALIDATION
// ============================================================

function assertExecutionSucceeded(
    result,
    actionName
) {

    if (
        result === undefined ||
        result === null
    ) {
        throw new Error(
            `Action '${actionName}' executed but returned no result`
        );
    }


    if (
        typeof result === "object" &&
        result.success === false
    ) {
        throw new Error(
            result.message ||
            `Action '${actionName}' failed`
        );
    }


    return result;
}


// ============================================================
// EXECUTE ONE ACTION
// ============================================================

async function executeAction(
    action,
    context = {}
) {

    if (!action) {
        throw new Error(
            "Action is required"
        );
    }


    if (action.enabled === false) {
        throw new Error(
            "Action is disabled"
        );
    }


    const projectId =
        context.projectId ||
        action.project ||
        null;

    if (!projectId) {
        throw new Error(
            "Project ID is required"
        );
    }


    const actionName =
        getActionName(action);

    if (!actionName) {
        throw new Error(
            "Action name is required"
        );
    }


    const runtimeContext = {

        projectId,

        actorId:
            context.actorId ||
            null,

        userId:
            context.userId ||
            null,

        data:
            context.data ||
            {},

        req:
            context.req ||
            null,

        event:
            context.event ||
            null,

        action,

        actionName
    };


    let result;


    // ========================================================
    // EXPLICIT HANDLER
    // ========================================================

    const configuredHandler =
        typeof action.config?.handler === "string" &&
        action.config.handler.trim()
            ? action.config.handler.trim()
            : null;

    if (configuredHandler) {

        result =
            await execute(
                configuredHandler,
                runtimeContext
            );

        result =
            assertExecutionSucceeded(
                result,
                actionName
            );

        return sanitizeActionResult(
            result
        );
    }


    // ========================================================
    // HANDLER ACTION
    // ========================================================

    if (action.type === "handler") {

        result =
            await execute(
                actionName,
                runtimeContext
            );

        result =
            assertExecutionSucceeded(
                result,
                actionName
            );

        return sanitizeActionResult(
            result
        );
    }


    // ========================================================
    // REGISTERED HANDLER
    // ========================================================

    if (has(actionName)) {

        result =
            await execute(
                actionName,
                runtimeContext
            );

        result =
            assertExecutionSucceeded(
                result,
                actionName
            );

        return sanitizeActionResult(
            result
        );
    }


    // ========================================================
    // UNIVERSAL ACTION
    // ========================================================

    result =
        await executeUniversalAction({

            actionRecord:
                action,

            projectId,

            actorId:
                context.actorId ||
                null,

            userId:
                context.userId ||
                null,

            data:
                context.data ||
                {},

            req:
                context.req ||
                null
        });


    result =
        assertExecutionSucceeded(
            result,
            actionName
        );


    return sanitizeActionResult(
        result
    );
}


// ============================================================
// PROCESS MULTIPLE ACTIONS
// ============================================================
//
// Every action is isolated.
//
// One failure does not turn into success.
// ============================================================

async function processActions(
    event = {},
    actions = []
) {

    if (!Array.isArray(actions)) {
        throw new Error(
            "Actions must be an array"
        );
    }


    const results = [];


    for (
        const action
        of actions
    ) {

        const actionName =
            getActionName(action);


        try {

            const result =
                await executeAction(
                    action,
                    {

                        projectId:
                            event.project ||
                            event.projectId ||
                            action?.project ||
                            null,

                        actorId:
                            event.actorId ||
                            event.userId ||
                            null,

                        userId:
                            event.userId ||
                            null,

                        data:
                            event.data ||
                            {},

                        req:
                            event.req ||
                            null,

                        event
                    }
                );


            results.push({

                action:
                    actionName,

                success:
                    true,

                result
            });


        } catch (error) {

            results.push({

                action:
                    actionName,

                success:
                    false,

                error:
                    error?.message ||
                    "Action execution failed"
            });
        }
    }


    return results;
}


// ============================================================
// UNIVERSAL CONFIGURATION DETECTION
// ============================================================

function hasUniversalConfiguration(
    action
) {

    if (!action) {
        return false;
    }


    const config =
        action.config &&
        typeof action.config === "object"
            ? action.config
            : {};


    if (action.type === "handler") {
        return false;
    }


    if (
        typeof config.handler === "string" &&
        config.handler.trim()
    ) {
        return false;
    }


    if (
        Array.isArray(config.steps) &&
        config.steps.length > 0
    ) {
        return true;
    }


    return (
        typeof config.resource === "string" &&
        config.resource.trim() &&
        typeof config.operation === "string" &&
        config.operation.trim()
    );
}


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================

async function processAction(
    action,
    context = {}
) {

    return executeAction(
        action,
        context
    );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    executeAction,

    executeUniversalAction,

    processAction,

    processActions,

    hasUniversalConfiguration
};
