const handlers =
    require("../handlers");

const {
    executeUniversalAction
} = require("./universalActionEngine");


// ============================================================
// DETECT UNIVERSAL ACTION CONFIGURATION
// ============================================================

function hasUniversalConfiguration(action) {

    if (!action) {
        return false;
    }

    const config =
        action.config || {};

    // Composed dynamic action
    if (
        Array.isArray(config.steps) &&
        config.steps.length > 0
    ) {
        return true;
    }

    // Single dynamic action
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
// EXECUTE ACTION
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


    /*
     * --------------------------------------------------------
     * UNIVERSAL CONFIGURATION FIRST
     * --------------------------------------------------------
     *
     * The Action document itself is passed directly to the
     * Universal Action Engine.
     *
     * The engine receives:
     *
     * action.name
     * action.config
     *
     * and the runtime context separately.
     *
     * This keeps Action -> Resource -> Operation completely
     * generic.
     */

    if (
        hasUniversalConfiguration(action)
    ) {

        return executeUniversalAction(

            action,

            context.data || {},

            {
                ...context,

                projectId:
                    context.projectId,

                actorId:
                    context.actorId || null,

                userId:
                    context.userId || null,

                req:
                    context.req || null,

                event:
                    context.event || null
            }

        );

    }


    /*
     * --------------------------------------------------------
     * FALLBACK HANDLER
     * --------------------------------------------------------
     *
     * Legacy/custom handlers remain supported.
     */

    if (
        typeof handlers.execute === "function"
    ) {

        try {

            return await handlers.execute(

                action.name,

                {
                    ...context,

                    action
                }

            );

        } catch (error) {

            /*
             * If a real handler exists but fails, preserve the
             * actual error.
             */

            const message =
                String(
                    error?.message || ""
                );

            const isMissingHandler =
                message ===
                `Handler '${action.name}' is not registered`;

            if (!isMissingHandler) {

                throw error;

            }

        }

    }


    /*
     * --------------------------------------------------------
     * NOTHING CAN EXECUTE THE ACTION
     * --------------------------------------------------------
     */

    throw new Error(
        `No executor found for action '${action.name}'`
    );

}


// ============================================================
// PROCESS ACTIONS
// ============================================================

async function processActions(
    event,
    actions = []
) {

    const results = [];


    for (
        const action of actions
    ) {

        const result =
            await executeAction(

                action,

                {
                    projectId:
                        event.project,

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
                        event.req || null,

                    event
                }

            );


        results.push({

            action:
                action.name,

            success:
                result?.success !== false,

            result

        });

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
