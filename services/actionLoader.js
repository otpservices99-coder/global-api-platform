// ============================================================
// GLOBAL ACTION LOADER
// ============================================================
//
// Loads enabled actions for a project.
//
// Actions can be executed through:
//
//     1. Explicit configured handlers
//     2. Explicit handler type
//     3. Dynamically registered handlers
//     4. Universal Resource → Operation configuration
//
// This file contains NO project-specific action mappings.
// ============================================================

const Action = require("../models/Action");

const {
    list
} = require("../handlers");

// ============================================================
// LOAD ACTIONS
// ============================================================

const loadActions = async (
    projectId
) => {
    if (!projectId) {
        throw new Error(
            "Project ID is required"
        );
    }

    const actions =
        await Action.find({
            project: projectId,
            enabled: true
        });

    const registeredHandlers =
        new Set(list());

    for (const action of actions) {
        const config =
            action.config &&
            typeof action.config === "object"
                ? action.config
                : {};

        // ====================================================
        // EXPLICIT HANDLER
        // ====================================================

        const configuredHandler =
            typeof config.handler === "string" &&
            config.handler.trim()
                ? config.handler.trim()
                : null;

        // ====================================================
        // REGISTERED HANDLER
        // ====================================================

        const registeredActionHandler =
            registeredHandlers.has(
                action.name
            );

        // ====================================================
        // EXPLICIT HANDLER TYPE
        // ====================================================

        const explicitHandlerType =
            action.type === "handler";

        // ====================================================
        // UNIVERSAL CONFIGURATION
        // ====================================================

        const hasUniversalConfiguration =
            (
                typeof config.resource === "string" &&
                config.resource.trim() &&
                typeof config.operation === "string" &&
                config.operation.trim()
            ) ||
            (
                Array.isArray(config.steps) &&
                config.steps.length > 0
            );

        // ====================================================
        // HANDLER ACTIONS
        // ====================================================
        //
        // Handler execution takes priority over universal
        // configuration.
        //
        // This is important because an action may still contain
        // legacy resource/operation configuration while having
        // a real specialized handler.
        // ====================================================

        if (
            configuredHandler ||
            explicitHandlerType ||
            registeredActionHandler
        ) {
            continue;
        }

        // ====================================================
        // UNIVERSAL ACTIONS
        // ====================================================

        if (hasUniversalConfiguration) {
            continue;
        }

        // ====================================================
        // INVALID ACTION
        // ====================================================

        console.warn(
            "⚠ Action has no executor:",
            action.name
        );
    }

    return actions;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    loadActions
};
