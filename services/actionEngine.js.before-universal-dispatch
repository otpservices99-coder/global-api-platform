// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// Universal execution facade.
//
// Priority:
//
// 1. Explicitly configured handler
// 2. Explicit multi-step configuration
// 3. Configured Resource + Operation
// 4. Implicit registered handler ONLY for actions explicitly
//    declared as handler actions
//
// IMPORTANT:
// A registered handler must NEVER override a database-configured
// resource operation.
//
// Every successful result must come from a real successful
// execution.
// ============================================================

const {
    executeUniversalAction,
    sanitizeActionResult
} = require("./universalActionEngine");

const {
    execute
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
// RESULT VALIDATION
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
        result.success !== true
    ) {

        throw new Error(
            result.message ||
            result.error ||
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
            context.data &&
            typeof context.data === "object"
                ? context.data
                : {},

        req:
            context.req ||
            null,

        event:
            context.event ||
            null,

        action,

        actionName
    };


    // ========================================================
    // EXPLICIT HANDLER
    // ========================================================

    const configuredHandler =
        typeof action.config?.handler === "string" &&
        action.config.handler.trim()
            ? action.config.handler.trim()
            : null;


    if (configuredHandler) {

        const result =
            await execute(
                configuredHandler,
                runtimeContext
            );


        assertExecutionSucceeded(
            result,
            actionName
        );


        return sanitizeActionResult(
            result
        );
    }


    // ========================================================
    // EXPLICIT HANDLER ACTION
    // ========================================================
    //
    // Only an action explicitly declared as a handler action
    // may use its registered action-name handler automatically.
    //
    // A normal resource action MUST NOT reach this branch.
    // ========================================================

    if (
        action.type === "handler"
    ) {

        const result =
            await execute(
                actionName,
                runtimeContext
            );


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
    //
    // Resource/operation configuration ALWAYS gets priority.
    //
    // This is the critical fix.
    // ========================================================

    const result =
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
                context.data || {},

            req:
                context.req ||
                null
        });


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
                            event.data || {},

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


    if (
        action.type === "handler"
    ) {

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
