const {
    executeUniversalAction
} = require("./universalActionEngine");


// ============================================================
// EXECUTE ACTION
// ============================================================

async function executeAction(
    action,
    context = {}
) {

    if (!action) {
        throw new Error("Action is required");
    }

    if (action.enabled === false) {
        throw new Error("Action is disabled");
    }


    const config =
        action.config || {};


    /*
     * --------------------------------------------------------
     * UNIVERSAL DYNAMIC ACTION
     * --------------------------------------------------------
     *
     * Resource and operation come entirely from the
     * database Action configuration.
     *
     * No action-name list exists here.
     *
     * Example database configuration:
     *
     * {
     *     resource: "anything",
     *     operation: "update"
     * }
     *
     * --------------------------------------------------------
     */

    if (
        config.resource &&
        config.operation
    ) {

        return executeUniversalAction({

            actionRecord:
                action,

            projectId:
                context.projectId,

            actorId:
                context.actorId || null,

            userId:
                context.userId || null,

            data:
                context.data || {},

            req:
                context.req || null

        });

    }


    /*
     * --------------------------------------------------------
     * EXPLICIT HANDLER
     * --------------------------------------------------------
     *
     * Only used when an Action does not define a universal
     * resource/operation.
     *
     * The engine itself does not know the handler names.
     * The handler registry discovers them dynamically.
     *
     * --------------------------------------------------------
     */

    const handlers =
        require("../handlers");


    if (
        typeof handlers.execute === "function"
    ) {

        return handlers.execute(

            action.name,

            {
                ...context,

                action

            }

        );

    }


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
// EXPORT
// ============================================================

module.exports = {

    executeAction,

    processActions

};
