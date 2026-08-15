const {
    executeUniversalAction
} = require("./universalActionEngine");

const handlers = require("../handlers");


// ============================================================
// EXECUTE SINGLE ACTION
// ============================================================
//
// Priority:
//
// 1. Registered handler
// 2. Universal resource/operation action
//
// This is important because an action such as:
//
//     wallet.credit
//
// has a real business handler and must not accidentally be
// redirected into generic CRUD/increment logic.
//
// New actions that do not have a registered handler can still
// work dynamically through:
//
//     config.resource
//     config.operation
//
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


    const config =
        action.config || {};


    // ========================================================
    // 1. EXPLICIT HANDLER FIRST
    // ========================================================

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
             * Only fall through to the universal engine when
             * the handler does not actually exist.
             *
             * A real handler throwing an error must NOT be
             * silently replaced by universal execution.
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


    // ========================================================
    // 2. UNIVERSAL DYNAMIC ACTION
    // ========================================================
    //
    // No registered handler exists.
    //
    // If the Action definition contains:
    //
    //     resource
    //     operation
    //
    // the universal engine handles it dynamically.
    //
    // ========================================================

    return executeUniversalAction({

        actionRecord: action,

        projectId: context.projectId,

        actorId: context.actorId || null,

        userId: context.userId || null,

        data: context.data || {},

        req: context.req || null

    });


    // ========================================================
    // 3. NOTHING CAN EXECUTE THE ACTION
    // ========================================================

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
