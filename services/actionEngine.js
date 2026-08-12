const Action = require("../models/Action");

const {
    execute
} = require("../handlers");

const {
    loadActions
} = require("./actionLoader");

const audit = require("./auditService");


/*
 * ============================================================
 * GLOBAL ACTION ENGINE
 * ============================================================
 *
 * Responsibilities:
 *
 * 1. Resolve an enabled action for the current project.
 * 2. Load the project's dynamic action handlers.
 * 3. Execute the requested action.
 * 4. Return the handler result.
 *
 * The engine does NOT contain project-specific business logic.
 *
 * Handlers are responsible for their own business operations
 * and specialized audit records.
 *
 * Generic audit logging can be explicitly requested through
 * context.audit.
 *
 * ============================================================
 */


const processAction = async (context = {}) => {

    try {

        const {
            projectId,
            action,
            user = null,
            actorId = null,
            data = {},
            req = null,
            audit: auditOptions = null
        } = context;


        /*
         * ----------------------------------------------------
         * Validate required context.
         * ----------------------------------------------------
         */

        if (!projectId) {

            return {
                success: false,
                message: "Project ID is required"
            };

        }


        if (!action) {

            return {
                success: false,
                message: "Action name is required"
            };

        }


        /*
         * ----------------------------------------------------
         * Load enabled actions for this project.
         *
         * The action loader is responsible for registering
         * project-specific handlers dynamically.
         * ----------------------------------------------------
         */

        await loadActions(projectId);


        /*
         * ----------------------------------------------------
         * Resolve the action record.
         *
         * Project ownership is always enforced.
         * ----------------------------------------------------
         */

        const actionRecord =
            await Action.findOne({

                project: projectId,

                name: action,

                enabled: true

            });


        if (!actionRecord) {

            return {

                success: false,

                message: "Action not found",

                action

            };

        }


        /*
         * ----------------------------------------------------
         * Build handler context.
         * ----------------------------------------------------
         */

        const handlerContext = {

            projectId,

            userId:
                user?._id || null,

            actorId,

            data,

            req

        };


        /*
         * ----------------------------------------------------
         * Execute the registered handler.
         * ----------------------------------------------------
         */

        const result =
            await execute(
                action,
                handlerContext
            );


        /*
         * ----------------------------------------------------
         * Handler failure.
         *
         * A handler may return:
         *
         * {
         *     success: false,
         *     message: "..."
         * }
         *
         * Do not create a successful generic audit record
         * for a failed action.
         * ----------------------------------------------------
         */

        if (
            result &&
            result.success === false
        ) {

            return result;

        }


        /*
         * ----------------------------------------------------
         * Optional generic audit.
         *
         * Generic auditing is opt-in.
         *
         * This prevents every handler from automatically
         * producing duplicate audit records while still
         * allowing future generic actions to request one.
         *
         * Example:
         *
         * audit: {
         *     enabled: true,
         *     resource: "some-resource",
         *     recordId: "..."
         * }
         * ----------------------------------------------------
         */

        if (
            auditOptions &&
            auditOptions.enabled === true
        ) {

            await audit.log({

                project:
                    projectId,

                actor:
                    actorId,

                user:
                    user?._id || null,

                action,

                resource:
                    auditOptions.resource ||
                    actionRecord.config?.resource ||
                    "",

                recordId:
                    auditOptions.recordId ||
                    null,

                metadata:
                    auditOptions.metadata ||
                    data,

                req

            });

        }


        /*
         * ----------------------------------------------------
         * Return the handler result.
         * ----------------------------------------------------
         */

        return result;


    } catch (error) {

        console.error(
            "Action execution error:",
            error
        );


        return {

            success: false,

            message:
                error.message ||
                "Action execution failed"

        };

    }

};


/*
 * ============================================================
 * PROCESS MULTIPLE ACTIONS
 * ============================================================
 *
 * Used by event/rule-driven workflows.
 *
 * Each action is processed through the same global
 * processAction() pipeline.
 *
 * ============================================================
 */


const processActions = async (
    event,
    actions = []
) => {

    if (!event) {

        throw new Error(
            "Event is required"
        );

    }


    if (!Array.isArray(actions)) {

        throw new Error(
            "Actions must be an array"
        );

    }


    const results = [];


    for (
        const item of actions
    ) {

        if (!item) {

            continue;

        }


        const result =
            await processAction({

                projectId:
                    event.project,

                action:
                    item.handler,

                user:
                    event.userId
                        ? {
                            _id:
                                event.userId
                        }
                        : null,

                actorId:
                    event.userId ||
                    null,

                data:
                    item.data ||
                    event.data ||
                    {},

                req:
                    event.req || null

            });


        results.push({

            action:
                item.handler,

            result

        });


        /*
         * Stop the chain when an action explicitly fails.
         *
         * This prevents later actions from running after a
         * failed financial or business operation.
         */

        if (
            result &&
            result.success === false
        ) {

            break;

        }

    }


    return results;

};


module.exports = {

    processAction,

    processActions

};
