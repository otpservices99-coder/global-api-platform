const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const apiUsage = require("../middleware/apiUsage");

const Action = require("../models/Action");
const Resource = require("../models/Resource");

const {
    executeUniversalAction,
    executeResourceAction
} = require("../services/universalActionEngine");

const {
    createRequestHash,
    claim,
    complete,
    fail,
    waitForCompletion,
    retryFailed
} = require("../services/idempotencyService");


// ============================================================================
// IDEMPOTENT ACTIONS
// ============================================================================
//
// Existing business actions keep their current idempotency behavior.
//
// Dynamic resource actions automatically receive idempotency when an
// Idempotency-Key is supplied. They do NOT need to be added to this list.
//

const IDEMPOTENT_ACTIONS = new Set([
    "wallet.credit",
    "wallet.debit",
    "reward.grant",
    "withdrawal.approve",
    "withdrawal.reject",
    "withdrawal.request",
    "user.delete"
]);


// ============================================================================
// READ-ONLY ACTIONS
// ============================================================================

const SKIP_IDEMPOTENCY = new Set([
    "wallet.view",
    "system.ping",
    "system.health",
    "transaction.find"
]);


// ============================================================================
// GENERIC RESOURCE OPERATIONS
// ============================================================================
//
// These are the operations exposed by the Universal ResourceService layer.
//
// No action-specific names belong here.
//
// If a Resource exists and the operation is one of these generic operations,
// the HTTP engine can execute it without requiring an Action document.
//

const UNIVERSAL_RESOURCE_OPERATIONS = new Set([
    "create",
    "find",
    "list",
    "findOne",
    "get",
    "view",
    "update",
    "delete",
    "remove",
    "increment",
    "decrement",
    "adjust",
    "set",
    "createMany",
    "updateMany",
    "deleteMany",
    "broadcast",
    "fanout",
    "ping",
    "health"
]);


// ============================================================================
// PROJECT ID
// ============================================================================

function getProjectId(req) {
    return (
        req.projectId ||
        req.project?._id ||
        req.project?.id ||
        null
    );
}


// ============================================================================
// IDEMPOTENCY KEY
// ============================================================================

function resolveIdempotencyKey(req) {
    const headerKey =
        req.get("Idempotency-Key");

    if (
        typeof headerKey === "string" &&
        headerKey.trim()
    ) {
        return headerKey.trim();
    }

    const bodyKey =
        req.body?.idempotencyKey;

    if (
        typeof bodyKey === "string" &&
        bodyKey.trim()
    ) {
        return bodyKey.trim();
    }

    const dataKey =
        req.body?.data?.idempotencyKey;

    if (
        typeof dataKey === "string" &&
        dataKey.trim()
    ) {
        return dataKey.trim();
    }

    return null;
}


// ============================================================================
// REMOVE IDEMPOTENCY KEY FROM BUSINESS DATA
// ============================================================================

function removeIdempotencyKeyFromData(data) {
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        return data || {};
    }

    const cleanData = {
        ...data
    };

    delete cleanData.idempotencyKey;

    return cleanData;
}


// ============================================================================
// FIND CONFIGURED ACTION
// ============================================================================

async function findActionRecord({
    projectId,
    action
}) {

    /*
     * ------------------------------------------------------------
     * EXISTING CONFIGURED ACTION
     * ------------------------------------------------------------
     *
     * Configured actions always take priority.
     *
     * This preserves all existing business actions such as:
     *
     *   withdrawal.approve
     *   reward.grant
     *   wallet.credit
     *
     * and any custom handler/configuration already stored.
     */
    const actionRecord =
        await Action.findOne({
            project: projectId,
            name: action,
            enabled: true
        });

    if (actionRecord) {
        return actionRecord;
    }

    /*
     * ------------------------------------------------------------
     * FULL UNIVERSAL ACTION FALLBACK
     * ------------------------------------------------------------
     *
     * Any unknown:
     *
     *     resource.operation
     *
     * is automatically interpreted as a universal resource action.
     *
     * No Action document is required.
     * No handler is required.
     * No REST route is required.
     *
     * Examples:
     *
     *     sponsoredTask.delete
     *     customer.create
     *     campaign.update
     *     offer.find
     *     product.delete
     *
     */
    if (
        typeof action !== "string" ||
        !action.trim()
    ) {
        const error = new Error(
            "Action is required"
        );

        error.statusCode = 400;

        throw error;
    }

    const parts =
        action
            .trim()
            .split(".")
            .filter(Boolean);

    if (parts.length < 2) {
        const error = new Error(
            `Action "${action}" not found or is disabled`
        );

        error.statusCode = 404;

        throw error;
    }

    const operation =
        parts.pop();

    const resource =
        parts.join(".");

    /*
     * Only treat this as an implicit universal action when
     * the operation is one of the generic ResourceService
     * operations.
     *
     * Business-specific operations continue to require their
     * existing configured Action record/handler.
     */
    const UNIVERSAL_OPERATIONS = new Set([
        "create",
        "find",
        "findOne",
        "get",
        "view",
        "list",
        "update",
        "delete",
        "remove",
        "increment",
        "decrement",
        "adjust",
        "set",
        "createMany",
        "updateMany",
        "deleteMany",
        "broadcast",
        "fanout"
    ]);

    if (!UNIVERSAL_OPERATIONS.has(operation)) {
        const error = new Error(
            `Action "${action}" not found or is disabled`
        );

        error.statusCode = 404;

        throw error;
    }

    console.log(
        "AUTO-UNIVERSAL ACTION:",
        JSON.stringify({
            action,
            resource,
            operation
        })
    );

    return {
        name: action,
        enabled: true,
        type: "universal",
        config: {
            resource,
            operation
        },

        /*
         * Marker for diagnostics.
         */
        autoDiscovered: true
    };
}

// ============================================================================
// PARSE UNIVERSAL RESOURCE ACTION
// ============================================================================
//
// Examples:
//
//     user.delete
//     sponsored.delete
//     sponsored.create
//     sponsored.update
//     notification.create
//     anything.find
//
// The action name itself becomes:
//
//     resource = "sponsored"
//     operation = "delete"
//
// No Action document is required.
//

function parseUniversalResourceAction(action) {
    if (
        typeof action !== "string"
    ) {
        return null;
    }

    const value =
        action.trim();

    if (!value) {
        return null;
    }

    const separator =
        value.lastIndexOf(".");

    if (
        separator <= 0 ||
        separator >= value.length - 1
    ) {
        return null;
    }

    const resource =
        value
            .slice(0, separator)
            .trim();

    const operation =
        value
            .slice(separator + 1)
            .trim();

    if (
        !resource ||
        !operation
    ) {
        return null;
    }

    return {
        resource,
        operation
    };
}


// ============================================================================
// FIND UNIVERSAL RESOURCE
// ============================================================================
//
// Resource names remain project-scoped.
//
// This means one project cannot dynamically execute another project's
// Resource definition.
//

async function findUniversalResource({
    projectId,
    resource
}) {
    if (
        !projectId ||
        !resource
    ) {
        return null;
    }

    /*
     * TRUE UNIVERSAL RESOURCE RESOLUTION
     *
     * The engine does not require a Resource document.
     *
     * resourceService resolves in this order:
     *
     *   1. configured Resource definition
     *   2. dynamically discovered Mongoose model
     *
     * Therefore any registered Mongoose model can become a
     * resource automatically without manually creating a
     * Resource record.
     */
    return await resourceService.getResource({
        projectId,
        resource
    });
}


// ============================================================================
// CHECK WHETHER AN ACTION CAN USE THE UNIVERSAL RESOURCE PATH
// ============================================================================

async function resolveDynamicAction({
    projectId,
    action
}) {
    const parsed =
        parseUniversalResourceAction(action);

    if (!parsed) {
        return null;
    }

    /*
     * ================================================================
     * TRUE UNIVERSAL RESOURCE DISCOVERY
     * ================================================================
     *
     * Do NOT require:
     *
     *   - an Action document
     *   - a Resource document
     *   - a hard-coded resource name
     *
     * The action itself declares:
     *
     *     resource.operation
     *
     * resourceService is responsible for resolving the resource.
     *
     * It first checks the configured Resource registry and then
     * dynamically discovers a registered Mongoose model.
     */

    const resourceDocument =
        await resourceService.getResource({
            projectId,
            resource: parsed.resource
        });

    if (!resourceDocument) {
        return null;
    }

    /*
     * Generic operations are universally available.
     *
     * Configured resources may additionally expose custom
     * operations through their Resource configuration.
     */

    const genericOperation =
        UNIVERSAL_RESOURCE_OPERATIONS.has(
            parsed.operation
        );

    const configuredOperations =
        resourceDocument?.settings?.operations ||
        resourceDocument?.operations ||
        {};

    const configuredOperation =
        Object.prototype.hasOwnProperty.call(
            configuredOperations,
            parsed.operation
        );

    if (
        !genericOperation &&
        !configuredOperation
    ) {
        return null;
    }

    console.log(
        "AUTO-UNIVERSAL ACTION:",
        JSON.stringify({
            action,
            resource: parsed.resource,
            operation: parsed.operation,
            dynamic: !configuredOperation
        })
    );

    return {
        name: action,
        enabled: true,
        type: "universal",
        config: {
            resource: parsed.resource,
            operation: parsed.operation
        },
        autoDiscovered: true
    };
}

// ============================================================================
// ENGINE ROUTE
// ============================================================================

router.post(
    "/",
    project,
    apiUsage,
    async (req, res) => {

        let idempotencyRecord = null;

        try {

            // =================================================================
            // REQUEST
            // =================================================================

            const action =
                req.body?.action;

            const originalData =
                req.body?.data || {};

            const projectId =
                getProjectId(req);


            if (!action) {
                return res.status(400).json({
                    success: false,
                    message: "Action is required"
                });
            }


            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    message: "Project context is required"
                });
            }


            // =================================================================
            // CLEAN DATA
            // =================================================================

            const data =
                removeIdempotencyKeyFromData(
                    originalData
                );


            // =================================================================
            // RESOLVE ACTION
            // =================================================================
            //
            // IMPORTANT:
            //
            // 1. Existing configured Action records ALWAYS win.
            //
            // 2. If no Action record exists, the engine attempts:
            //
            //        resource.operation
            //
            // 3. If the Resource exists and the operation is generic,
            //    executeResourceAction() handles it.
            //
            // This preserves all existing business actions while making
            // generic resource actions truly dynamic.
            //

            const actionRecord =
                await findActionRecord({
                    projectId,
                    action
                });


            let dynamicAction = null;


            if (!actionRecord) {
                dynamicAction =
                    await resolveDynamicAction({
                        projectId,
                        action
                    });

                if (!dynamicAction) {
                    const error =
                        new Error(
                            `Action "${action}" not found or is not a configured universal resource action`
                        );

                    error.statusCode = 404;

                    throw error;
                }
            }


            // =================================================================
            // IDEMPOTENCY
            // =================================================================
            //
            // Existing configured actions retain their previous behavior.
            //
            // Dynamic resource actions automatically support idempotency
            // whenever the caller supplies Idempotency-Key.
            //

            const idempotencyKey =
                resolveIdempotencyKey(req);


            const useIdempotency =
                Boolean(
                    idempotencyKey &&
                    !SKIP_IDEMPOTENCY.has(action) &&
                    (
                        IDEMPOTENT_ACTIONS.has(action) ||
                        Boolean(dynamicAction)
                    )
                );


            if (useIdempotency) {

                const requestHash =
                    createRequestHash({
                        action,
                        data
                    });


                let claimResult =
                    await claim({
                        projectId,
                        key:
                            idempotencyKey,
                        action,
                        requestHash
                    });


                // =============================================================
                // FIRST REQUEST
                // =============================================================

                if (
                    claimResult.owner
                ) {

                    idempotencyRecord =
                        claimResult.record;

                } else {

                    let existing =
                        claimResult.record;


                    if (!existing) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "Unable to acquire idempotency lock"
                        });
                    }


                    // =========================================================
                    // SAME KEY + DIFFERENT REQUEST
                    // =========================================================

                    if (
                        existing.requestHash &&
                        existing.requestHash !== requestHash
                    ) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "Idempotency key was already used with a different request"
                        });
                    }


                    // =========================================================
                    // COMPLETED
                    // =========================================================

                    if (
                        existing.status === "completed"
                    ) {
                        return res
                            .status(
                                existing.responseStatus || 200
                            )
                            .json(
                                existing.responseBody
                            );
                    }


                    // =========================================================
                    // PROCESSING
                    // =========================================================

                    if (
                        existing.status === "processing"
                    ) {

                        existing =
                            await waitForCompletion({
                                projectId,
                                key:
                                    idempotencyKey
                            });


                        if (
                            existing &&
                            existing.status === "completed"
                        ) {
                            return res
                                .status(
                                    existing.responseStatus || 200
                                )
                                .json(
                                    existing.responseBody
                                );
                        }


                        if (
                            existing &&
                            existing.status === "failed"
                        ) {

                            const retry =
                                await retryFailed({
                                    projectId,
                                    key:
                                        idempotencyKey,
                                    action,
                                    requestHash
                                });


                            if (!retry) {
                                return res.status(409).json({
                                    success: false,
                                    message:
                                        "Request with this Idempotency-Key is being retried"
                                });
                            }


                            idempotencyRecord =
                                retry;

                        } else {

                            return res.status(409).json({
                                success: false,
                                message:
                                    "Request with this Idempotency-Key is still in progress"
                            });
                        }
                    }


                    // =========================================================
                    // FAILED
                    // =========================================================

                    else if (
                        existing.status === "failed"
                    ) {

                        const retry =
                            await retryFailed({
                                projectId,
                                key:
                                    idempotencyKey,
                                action,
                                requestHash
                            });


                        if (!retry) {
                            return res.status(409).json({
                                success: false,
                                message:
                                    "Request with this Idempotency-Key is being retried"
                            });
                        }


                        idempotencyRecord =
                            retry;
                    }


                    // =========================================================
                    // UNKNOWN STATE
                    // =========================================================

                    else {

                        return res.status(409).json({
                            success: false,
                            message:
                                "Invalid idempotency request state"
                        });
                    }
                }
            }


            // =================================================================
            // EXECUTION
            // =================================================================

            let result;


            // =================================================================
            // EXISTING CONFIGURED ACTION
            // =================================================================
            //
            // Business actions remain completely unchanged.
            //

            if (actionRecord) {

                result =
                    await executeUniversalAction({
                        actionRecord,
                        projectId,

                        actorId:
                            req.user?._id ||
                            req.user?.id ||
                            req.auth?.userId ||
                            null,

                        userId:
                            data.user ||
                            data.userId ||
                            null,

                        data,
                        req
                    });

            }


            // =================================================================
            // GLOBAL DYNAMIC RESOURCE ACTION
            // =================================================================
            //
            // Example:
            //
            //     POST /api/v1/engine
            //
            //     {
            //       "action": "sponsored.delete",
            //       "data": {
            //         "id": "..."
            //       }
            //     }
            //
            // No Action document.
            // No handler.
            // No new REST route.
            //
            // The existing Resource + ResourceService operation is used.
            //

            else {

                const dynamicConfig = {
                    ...req.body?.config,
                    data
                };


                result =
                    await executeResourceAction(
                        dynamicAction.resource,
                        dynamicAction.operation,
                        dynamicConfig,
                        {
                            projectId,

                            actorId:
                                req.user?._id ||
                                req.user?.id ||
                                req.auth?.userId ||
                                null,

                            userId:
                                data.user ||
                                data.userId ||
                                null,

                            data,

                            req,

                            actionName:
                                action,

                            dynamic: true,

                            resource:
                                dynamicAction.resource,

                            operation:
                                dynamicAction.operation,

                            resourceDocument:
                                dynamicAction.resourceDocument
                        }
                    );
            }


            // =================================================================
            // RESPONSE
            // =================================================================

            const responseBody = {
                success: true,
                action,
                result
            };


            // =================================================================
            // COMPLETE IDEMPOTENCY
            // =================================================================

            if (
                idempotencyRecord
            ) {

                await complete({
                    recordId:
                        idempotencyRecord._id,

                    responseStatus:
                        200,

                    responseBody
                });
            }


            // =================================================================
            // SUCCESS
            // =================================================================

            return res.json(
                responseBody
            );


        } catch (error) {

            console.error(
                "UNIVERSAL ENGINE ERROR:",
                error
            );


            // =================================================================
            // FAIL IDEMPOTENCY
            // =================================================================

            if (
                idempotencyRecord
            ) {

                try {

                    await fail({
                        recordId:
                            idempotencyRecord._id,

                        errorMessage:
                            error.message
                    });

                } catch (idempotencyError) {

                    console.error(
                        "IDEMPOTENCY FAILURE:",
                        idempotencyError
                    );
                }
            }


            // =================================================================
            // ERROR
            // =================================================================

            return res
                .status(
                    error.statusCode || 500
                )
                .json({
                    success: false,
                    message:
                        error.message ||
                        "Action execution failed"
                });
        }
    }
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
