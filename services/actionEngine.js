// ============================================================
// GLOBAL ACTION ENGINE COMPATIBILITY FACADE
// ============================================================
//
// Backward-compatible entry point for:
//
//     services/actionEngine
//
// All action execution is routed through either:
//
//     1. A registered specialized handler
//     2. The Universal Action Engine
//
// No project-specific logic lives here.
// ============================================================

const {
    executeUniversalAction
} = require("./universalActionEngine");

const {
    execute,
    has
} = require("../handlers");

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
        action.name ||
        action.action ||
        action.key ||
        null;

    if (!actionName) {
        throw new Error("Action name is required");
    }

    const runtimeContext = {
        projectId,
        actorId: context.actorId || null,
        userId: context.userId || null,
        data: context.data || {},
        req: context.req || null,
        event: context.event || null,
        action
    };

    // ========================================================
    // 1. EXPLICIT HANDLER
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
    // 2. EXPLICIT HANDLER TYPE
    // ========================================================

    if (action.type === "handler") {
        return execute(
            actionName,
            runtimeContext
        );
    }

    // ========================================================
    // 3. REGISTERED HANDLER
    // ========================================================
    //
    // Backward compatibility:
    // if a handler exists for the action name, use it.
    //
    // This allows existing handler actions to continue working
    // even before their database records are normalized.
    // ========================================================

    if (has(actionName)) {
        return execute(
            actionName,
            runtimeContext
        );
    }

    // ========================================================
    // 4. UNIVERSAL ACTION
    // ========================================================

    return executeUniversalAction({
        actionRecord: action,
        projectId,
        actorId: context.actorId || null,
        userId: context.userId || null,
        data: context.data || {},
        req: context.req || null
    });
}

// ============================================================
// PROCESS MULTIPLE ACTIONS
// ============================================================
//
// Each action executes independently.
// One failed action does not stop the others.
// ============================================================

async function processActions(
    event = {},
    actions = []
) {
    if (!Array.isArray(actions)) {
        throw new Error("Actions must be an array");
    }

    const results = [];

    for (const action of actions) {
        try {
            const result = await executeAction(
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
                    action?.name ||
                    action?.action ||
                    action?.key ||
                    null,

                success:
                    result?.success !== false,

                result
            });
        } catch (error) {
            results.push({
                action:
                    action?.name ||
                    action?.action ||
                    action?.key ||
                    null,

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
// UNIVERSAL CONFIGURATION DETECTION
// ============================================================

function hasUniversalConfiguration(action) {
    if (!action) {
        return false;
    }

    const config =
        action.config &&
        typeof action.config === "object"
            ? action.config
            : {};

    // Explicit handler actions are never considered universal.
    if (action.type === "handler") {
        return false;
    }

    if (
        typeof config.handler === "string" &&
        config.handler.trim()
    ) {
        return false;
    }

    // Multi-step universal action.
    if (
        Array.isArray(config.steps) &&
        config.steps.length > 0
    ) {
        return true;
    }

    // Normal universal resource operation.
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
// EXPORTS
// ============================================================

module.exports = {
    executeAction,
    processActions,
    hasUniversalConfiguration
};
