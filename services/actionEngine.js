// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// Universal execution priority:
//
// 1. Explicit Resource -> Operation configuration
// 2. Explicit multi-step universal configuration
// 3. Explicit configured handler
// 4. Explicit handler type
// 5. Legacy registered handler
//
// The universal configuration always wins when an Action
// explicitly defines a Resource/Operation or Steps.
//
// No Earnify-specific action names are implemented here.
// ============================================================

const {
    executeUniversalAction
} = require("./universalActionEngine");

const {
    execute,
    has
} = require("../handlers");


// ============================================================
// HELPERS
// ============================================================

function getActionName(action) {
    return (
        action?.name ||
        action?.action ||
        action?.key ||
        null
    );
}


function hasUniversalConfiguration(action) {
    if (!action) {
        return false;
    }

    const config =
        action.config &&
        typeof action.config === "object"
            ? action.config
            : {};

    // Explicit handler configuration is handler-based.
    if (
        typeof config.handler === "string" &&
        config.handler.trim()
    ) {
        return false;
    }

    // Explicit multi-step universal action.
    if (
        Array.isArray(config.steps) &&
        config.steps.length > 0
    ) {
        return true;
    }

    // Explicit Resource -> Operation action.
    if (
        typeof config.resource === "string" &&
        config.resource.trim() &&
        typeof config.operation === "string" &&
        config.operation.trim()
    ) {
        return true;
    }

    return false;
}


// ============================================================
// EXECUTE ONE ACTION
// ============================================================

async function executeAction(action, context = {}) {

    if (!action) {
        throw new Error("Action is required");
    }

    if (action.enabled === false) {
        throw new Error("Action is disabled");
    }

    const projectId =
        context.projectId ||
        action.project ||
        null;

    if (!projectId) {
        throw new Error("Project ID is required");
    }

    const actionName =
        getActionName(action);

    if (!actionName) {
        throw new Error("Action name is required");
    }

    const runtimeContext = {
        projectId,

        actorId:
            context.actorId || null,

        userId:
            context.userId || null,

        data:
            context.data || {},

        req:
            context.req || null,

        event:
            context.event || null,

        action
    };


    // ========================================================
    // 1. UNIVERSAL CONFIGURATION
    // ========================================================
    //
    // If the database explicitly defines:
    //
    //     resource
    //     operation
    //
    // or:
    //
    //     steps
    //
    // the Universal Action Engine is authoritative.
    //
    // This is what makes future actions dynamically executable
    // without registering another JavaScript handler.
    // ========================================================

    if (
        hasUniversalConfiguration(action)
    ) {

        return executeUniversalAction({
            actionRecord: action,

            projectId,

            actorId:
                context.actorId || null,

            userId:
                context.userId || null,

            data:
                context.data || {},

            req:
                context.req || null,

            event:
                context.event || null
        });
    }


    // ========================================================
    // 2. EXPLICITLY CONFIGURED HANDLER
    // ========================================================

    const configuredHandler =
        typeof action.config?.handler === "string" &&
        action.config.handler.trim()
            ? action.config.handler.trim()
            : null;

    if (configuredHandler) {

        return execute(
            configuredHandler,
            runtimeContext
        );
    }


    // ========================================================
    // 3. EXPLICIT HANDLER TYPE
    // ========================================================

    if (
        action.type === "handler"
    ) {

        return execute(
            actionName,
            runtimeContext
        );
    }


    // ========================================================
    // 4. LEGACY REGISTERED HANDLER
    // ========================================================
    //
    // Kept only for backward compatibility with existing
    // actions that have not yet been converted to universal
    // Resource -> Operation configuration.
    //
    // It can NEVER override explicit universal configuration.
    // ========================================================

    if (
        has(actionName)
    ) {

        return execute(
            actionName,
            runtimeContext
        );
    }


    // ========================================================
    // 5. NO EXECUTION STRATEGY
    // ========================================================

    throw new Error(
        `Action '${actionName}' has no executable configuration`
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

    for (const action of actions) {

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
                    getActionName(action),

                success:
                    result?.success !== false,

                result

            });

        } catch (error) {

            results.push({

                action:
                    getActionName(action),

                success: false,

                error:
                    error?.message ||
                    "Action execution failed"

            });
        }
    }

    return results;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    executeAction,
    processActions,
    hasUniversalConfiguration
};
