const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const apiUsage = require("../middleware/apiUsage");

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
//
// These actions can create financial/state-changing effects.
//
// When an Idempotency-Key is supplied, the same key is guaranteed to execute
// only once per project within the configured TTL.
//
// Requests without an Idempotency-Key continue to behave exactly as before.
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
//
// PRECEDENCE:
//
// 1. Idempotency-Key header
// 2. body.idempotencyKey
// 3. body.data.idempotencyKey
//
// The header always wins when both are supplied.
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
// REMOVE IDEMPOTENCY KEY FROM ACTION DATA
// ============================================================================
//
// The idempotency key controls the HTTP request and must not accidentally
// become part of the action's business data.
//
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
            // BASIC REQUEST DATA
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
            // CLEAN ACTION DATA
            // =================================================================

            const data =
                removeIdempotencyKeyFromData(
                    originalData
                );


            // =================================================================
            // IDEMPOTENCY GATE
            // =================================================================
            //
            // CRITICAL:
            //
            // executeUniversalAction() MUST NOT be reached until this section
            // has established ownership of the idempotency key.
            //
            // =================================================================

            if (useIdempotency) {

                const requestHash =
                    createRequestHash({
                        action,
                        data
                    });


                // =============================================================
                // ATOMIC CLAIM
                // =============================================================

                let claimResult =
                    await claim({
                        projectId,
                        key: idempotencyKey,
                        action,
                        requestHash
                    });


                // =============================================================
                // FIRST REQUEST
                // =============================================================

                if (claimResult.owner) {

                    idempotencyRecord =
                        claimResult.record;

                } else {

                    // =========================================================
                    // EXISTING RECORD
                    // =========================================================

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
                    // SAME KEY + DIFFERENT PAYLOAD
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
                    //
                    // THIS IS THE MOST IMPORTANT BRANCH.
                    //
                    // The original action has already executed.
                    //
                    // NEVER call executeUniversalAction() again.
                    //
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
                    //
                    // Another request currently owns this key.
                    //
                    // Wait for that request to finish.
                    //
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
                        // ORIGINAL REQUEST FINISHED SUCCESSFULLY
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
                        // ORIGINAL REQUEST FAILED
                        // =====================================================
                        //
                        // Allow this request to retry the failed operation.
                        //
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

                            // =================================================
                            // STILL PROCESSING
                            // =================================================

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
                    //
                    // If the original request failed and there was no waiting
                    // cycle above, allow this request to retry.
                    //
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
            // UNIVERSAL ACTION ENGINE
            // =================================================================
            //
            // IMPORTANT:
            //
            // For idempotent requests this line is reached ONLY by the request
            // that successfully acquired the MongoDB idempotency lock.
            //
            // =================================================================

            const result =
                await executeUniversalAction({
                    projectId,
                    action,
                    data,
                    req
                });


            // =================================================================
            // NORMAL PUBLIC RESPONSE
            // =================================================================
            //
            // Do not change the existing success response shape.
            //
            // =================================================================

            const responseBody = {
                success: true,
                action,
                result
            };


            // =================================================================
            // STORE SUCCESSFUL RESPONSE
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
            // RETURN
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
            // NORMAL ERROR RESPONSE
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
