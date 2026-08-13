const Action = require("../models/Action");

const {
    execute
} = require("../handlers");

const {
    loadActions
} = require("./actionLoader");

const {
    executeUniversalAction
} = require("./universalActionEngine");

const audit = require("./auditService");


// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// Central execution gateway for the platform.
//
// Supports:
//
// 1. Dynamic universal resource operations
//
//    create
//    find
//    read
//    findOne
//    update
//    delete
//    increment
//    decrement
//
// 2. Specialized registered handlers
//
//    wallet.credit
//    wallet.debit
//    withdrawal.approve
//    withdrawal.reject
//    user.status_update
//    user.role_update
//    notification.send
//
// 3. Multiple action execution
//
//    events
//    rules
//    workflows
//    automation
//    HTTP engine
//
// ============================================================



// ============================================================
// UNIVERSAL OPERATIONS
// ============================================================

const UNIVERSAL_OPERATIONS = new Set([

    "create",

    "find",

    "read",

    "findOne",

    "update",

    "delete",

    "increment",

    "decrement"

]);



const isUniversalOperation = (operation) => {

    if (!operation) {

        return false;

    }

    return UNIVERSAL_OPERATIONS.has(
        String(operation).trim()
    );

};



// ============================================================
// PROCESS SINGLE ACTION
// ============================================================

const processAction = async (
    context = {}
) => {

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



        // ====================================================
        // VALIDATION
        // ====================================================

        if (!projectId) {

            return {

                success: false,

                message:
                    "Project ID is required"

            };

        }



        if (!action) {

            return {

                success: false,

                message:
                    "Action name is required"

            };

        }



        const actionName =
            String(action).trim();



        if (!actionName) {

            return {

                success: false,

                message:
                    "Action name is required"

            };

        }



        // ====================================================
        // LOAD PROJECT ACTIONS
        // ====================================================

        await loadActions(
            projectId
        );



        // ====================================================
        // FIND ACTION DEFINITION
        // ====================================================

        const actionRecord =
            await Action.findOne({

                project:
                    projectId,

                name:
                    actionName,

                enabled:
                    true

            });



        if (!actionRecord) {

            return {

                success: false,

                message:
                    "Action not found",

                action:
                    actionName

            };

        }



        // ====================================================
        // ACTION CONFIG
        // ====================================================

        const config =
            actionRecord.config || {};



        /*
        |--------------------------------------------------------------------------
        | Support both future/current Action structures
        |--------------------------------------------------------------------------
        |
        | Newer Action documents may eventually contain:
        |
        |     operation
        |     resource
        |
        | Older documents keep them inside config:
        |
        |     config.operation
        |     config.resource
        |
        */

        const operation =
            actionRecord.operation ||
            config.operation ||
            null;



        const resource =
            actionRecord.resource ||
            config.resource ||
            null;



        // ====================================================
        // BUILD EXECUTION CONTEXT
        // ====================================================

        const executionContext = {

            projectId,

            project:
                projectId,

            action:
                actionName,

            actionId:
                actionRecord._id,

            actionRecord,

            actionConfig:
                config,

            operation,

            resource,

            user,

            userId:
                user?._id ||
                context.userId ||
                null,

            actorId,

            data,

            req

        };



        // ====================================================
        // UNIVERSAL ACTION
        // ====================================================
        //
        // Genuine CRUD operations are sent to the
        // Universal Action Engine.
        //
        // Example:
        //
        // {
        //   name: "create.post",
        //   config: {
        //      resource: "post",
        //      operation: "create"
        //   }
        // }
        //
        // Specialized actions such as:
        //
        // wallet.credit
        //
        // use their registered handler instead.
        //
        // ====================================================

        if (
            resource &&
            isUniversalOperation(
                operation
            )
        ) {

            const result =
                await executeUniversalAction({

                    projectId,

                    actorId,

                    userId:
                        user?._id ||
                        context.userId ||
                        null,

                    action:
                        actionName,

                    resource,

                    operation,

                    config,

                    data,

                    req

                });



            // =================================================
            // AUDIT
            // =================================================

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
                        user?._id ||
                        context.userId ||
                        null,

                    action:
                        actionName,

                    resource:
                        auditOptions.resource ||
                        resource ||
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



            return result;

        }



        // ====================================================
        // SPECIALIZED HANDLER
        // ====================================================

        const handlerResult =
            await execute(

                actionName,

                executionContext

            );



        // ====================================================
        // AUDIT SPECIALIZED ACTION
        // ====================================================

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
                    user?._id ||
                    context.userId ||
                    null,

                action:
                    actionName,

                resource:
                    auditOptions.resource ||
                    resource ||
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



        return handlerResult;



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



// ============================================================
// PROCESS MULTIPLE ACTIONS
// ============================================================
//
// Used by:
//
// - HTTP engine
// - events
// - rules
// - workflows
// - automation
//
// Every action passes through processAction().
//
// Supports action objects using:
//
//     item.name
//
//     item.action
//
//     item.handler
//
// This keeps the engine compatible with:
//
//     MongoDB Action documents
//     legacy action objects
//     workflow actions
//     rule actions
//     event actions
//
// ============================================================

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



        // ====================================================
        // RESOLVE ACTION NAME
        // ====================================================

        /*
        |--------------------------------------------------------------------------
        | MongoDB Action documents
        |--------------------------------------------------------------------------
        |
        | Your Action model uses:
        |
        |     name
        |
        |--------------------------------------------------------------------------
        | Older/internal objects
        |--------------------------------------------------------------------------
        |
        | May use:
        |
        |     action
        |     handler
        |
        |--------------------------------------------------------------------------
        */

        const actionName =

            item.name ||

            item.handler ||

            item.action;



        if (!actionName) {

            results.push({

                action:
                    null,

                result: {

                    success:
                        false,

                    message:
                        "Action name is required"

                }

            });

            continue;

        }



        // ====================================================
        // RESOLVE DATA
        // ====================================================

        /*
        |--------------------------------------------------------------------------
        | Action-specific data takes priority.
        |
        | Otherwise use event.data.
        |--------------------------------------------------------------------------
        */

        const actionData =

            item.data !== undefined

                ? item.data

                : (
                    event.data ||
                    {}
                );



        // ====================================================
        // EXECUTE SINGLE ACTION
        // ====================================================

        const result =
            await processAction({

                projectId:
                    event.project,

                action:
                    actionName,

                user:
                    event.userId

                        ? {

                            _id:
                                event.userId

                        }

                        : null,

                actorId:

                    event.actorId ||

                    event.userId ||

                    null,

                userId:
                    event.userId ||
                    null,

                data:
                    actionData,

                req:
                    event.req ||
                    null,

                audit:
                    event.audit ||
                    null

            });



        // ====================================================
        // STORE RESULT
        // ====================================================

        results.push({

            action:
                actionName,

            result

        });

    }



    return results;

};



// ============================================================
// EXPORT
// ============================================================

module.exports = {

    processAction,

    processActions,

    isUniversalOperation,

    UNIVERSAL_OPERATIONS

};
