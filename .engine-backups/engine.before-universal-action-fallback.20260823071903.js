const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const apiUsage = require("../middleware/apiUsage");

const Action = require("../models/Action");

const {
    executeUniversalAction
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
// FIND ACTION RECORD
// ============================================================================
//
// UniversalActionEngine.executeUniversalAction() requires:
//
//     actionRecord
//
// The HTTP route receives:
//
//     action: "wallet.credit"
//
// Therefore this route resolves the DB Action record before execution.
//
// ============================================================================

async function findActionRecord({
    projectId,
    action
}) {
    const actionRecord =
        await Action.findOne({
            project: projectId,
            name: action,
            enabled: true
        });

    if (!actionRecord) {
        const error =
            new Error(
                `Action "${action}" not found or is disabled`
            );

        error.statusCode = 404;

        throw error;
    }

    return actionRecord;
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
            // REQUEST DATA
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
            // CLEAN BUSINESS DATA
            // =================================================================

            const data =
                removeIdempotencyKeyFromData(
                    originalData
                );


            // =================================================================
            // RESOLVE IDEMPOTENCY KEY
            // =================================================================

            const idempotencyKey =
                resolveIdempotencyKey(req);


            const useIdempotency =
                Boolean(
                    idempotencyKey &&
                    IDEMPOTENT_ACTIONS.has(action) &&
                    !SKIP_IDEMPOTENCY.has(action)
                );


            // =================================================================
            // IDEMPOTENCY GATE
            // =================================================================

            if (useIdempotency) {

                const requestHash =
                    createRequestHash({
                        action,
                        data
                    });


                let claimResult =
                    await claim({
                        projectId,
                        key: idempotencyKey,
                        action,
                        requestHash
                    });


                // =============================================================
                // FIRST REQUEST OWNS THE KEY
                // =============================================================

                if (claimResult.owner) {

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
                    // ALREADY COMPLETED
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
                                key: idempotencyKey
                            });


                        // =====================================================
                        // COMPLETED WHILE WE WAITED
                        // =====================================================

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


                        // =====================================================
                        // FAILED WHILE WE WAITED
                        // =====================================================

                        if (
                            existing &&
                            existing.status === "failed"
                        ) {

                            const retry =
                                await retryFailed({
                                    projectId,
                                    key: idempotencyKey,
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
                                key: idempotencyKey,
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
            // LOAD THE REAL ACTION RECORD
            // =================================================================
            //
            // THIS FIXES:
            //
            //     "Action record is required"
            //
            // UniversalActionEngine expects:
            //
            //     actionRecord
            //
            // not:
            //
            //     action
            //
            // =================================================================

            const actionRecord =
                await findActionRecord({
                    projectId,
                    action
                });


            // =================================================================
            // UNIVERSAL ACTION ENGINE
            // =================================================================
            //
            // IMPORTANT:
            //
            // The DB Action record is now supplied correctly.
            //
            // =================================================================

            const result =
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


            // =================================================================
            // PUBLIC RESPONSE
            // =================================================================

            const responseBody = {
                success: true,
                action,
                result
            };


            // =================================================================
            // SAVE IDEMPOTENT RESPONSE
            // =================================================================

            if (idempotencyRecord) {

                await complete({
                    recordId:
                        idempotencyRecord._id,

                    responseStatus:
                        200,

                    responseBody
                });
            }


            // =================================================================
            // RETURN SUCCESS
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
            // MARK IDEMPOTENT REQUEST FAILED
            // =================================================================

            if (idempotencyRecord) {

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
            // ERROR RESPONSE
            // =================================================================

            return res.status(
                error.statusCode || 500
            ).json({
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
