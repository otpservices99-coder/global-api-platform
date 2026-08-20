const crypto = require("crypto");

const IdempotencyRecord =
    require("../models/IdempotencyRecord");

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_TTL_SECONDS =
    Number(process.env.IDEMPOTENCY_TTL_SECONDS) ||
    24 * 60 * 60;

// How long a duplicate request waits for the original request.
const WAIT_INTERVAL_MS = 100;

// Maximum time to wait before returning 409.
const WAIT_TIMEOUT_MS = 3000;

// ============================================================
// CANONICALIZE OBJECT
// ============================================================
//
// Stable serialization is important because:
//
// { user: "abc", amount: 10 }
//
// and:
//
// { amount: 10, user: "abc" }
//
// should produce the same request hash.
//
// ============================================================

function canonicalize(value) {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (
        typeof value === "object" &&
        !(value instanceof Date)
    ) {
        const output = {};

        for (
            const key of Object.keys(value).sort()
        ) {
            output[key] =
                canonicalize(value[key]);
        }

        return output;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

// ============================================================
// REQUEST HASH
// ============================================================

function createRequestHash({
    action,
    data
}) {
    const payload = canonicalize({
        action,
        data
    });

    return crypto
        .createHash("sha256")
        .update(
            JSON.stringify(payload)
        )
        .digest("hex");
}

// ============================================================
// EXPIRATION
// ============================================================

function getExpiresAt() {
    return new Date(
        Date.now() +
        DEFAULT_TTL_SECONDS * 1000
    );
}

// ============================================================
// CLAIM
// ============================================================
//
// First request:
//     owner = true
//
// Concurrent duplicate:
//     owner = false
//
// MongoDB's unique index is the actual concurrency lock.
// ============================================================

async function claim({
    projectId,
    key,
    action,
    requestHash
}) {
    if (!projectId) {
        throw new Error(
            "Project ID is required for idempotency"
        );
    }

    if (!key) {
        throw new Error(
            "Idempotency key is required"
        );
    }

    /*
     * First check.
     *
     * This handles completed/processing/failed records without
     * attempting another database insert.
     */
    const existing =
        await IdempotencyRecord.findOne({
            project: projectId,
            key
        });

    if (existing) {
        return {
            owner: false,
            record: existing
        };
    }

    /*
     * IMPORTANT:
     *
     * Do not execute the action until this create succeeds.
     *
     * The unique { project, key } MongoDB index is the
     * concurrency lock.
     */
    try {
        const record =
            await IdempotencyRecord.create({
                project: projectId,
                key,
                action,
                requestHash,
                status: "processing",
                responseStatus: 200,
                responseBody: null,
                errorMessage: null,
                expiresAt: getExpiresAt()
            });

        return {
            owner: true,
            record
        };

    } catch (error) {

        /*
         * MongoDB duplicate-key means another request won
         * the idempotency lock.
         *
         * NEVER execute the action in this case.
         */
        if (error && error.code === 11000) {

            const concurrent =
                await IdempotencyRecord.findOne({
                    project: projectId,
                    key
                });

            if (!concurrent) {
                throw new Error(
                    "Idempotency lock was claimed by another request but could not be retrieved"
                );
            }

            return {
                owner: false,
                record: concurrent
            };
        }

        throw error;
    }
}

// ============================================================
// COMPLETE
// ============================================================

async function complete({
    recordId,
    responseStatus = 200,
    responseBody
}) {
    if (!recordId) {
        return null;
    }

    /*
     * Convert the response into plain JSON-safe data before
     * persisting it.
     *
     * This prevents Mongoose documents / ObjectIds from being
     * stored as unexpected internal structures.
     */
    let safeBody;

    try {
        safeBody =
            JSON.parse(
                JSON.stringify(responseBody)
            );
    } catch (error) {
        safeBody = responseBody;
    }

    return IdempotencyRecord.findByIdAndUpdate(
        recordId,
        {
            $set: {
                status: "completed",
                responseStatus,
                responseBody: safeBody,
                errorMessage: null
            }
        },
        {
            new: true
        }
    );
}

// ============================================================
// FAIL
// ============================================================
//
// Failed requests remain retryable with the same key.
// ============================================================

async function fail({
    recordId,
    errorMessage
}) {
    if (!recordId) {
        return null;
    }

    return IdempotencyRecord.findByIdAndUpdate(
        recordId,
        {
            $set: {
                status: "failed",
                errorMessage:
                    errorMessage ||
                    "Action execution failed"
            }
        },
        {
            new: true
        }
    );
}

// ============================================================
// RETRY FAILED REQUEST
// ============================================================
//
// Atomically changes:
//
//     failed -> processing
//
// Only one retry can acquire the record.
// ============================================================

async function retryFailed({
    projectId,
    key,
    action,
    requestHash
}) {
    const record =
        await IdempotencyRecord.findOneAndUpdate(
            {
                project: projectId,
                key,
                status: "failed",
                requestHash
            },
            {
                $set: {
                    status: "processing",
                    action,
                    requestHash,
                    errorMessage: null,
                    responseBody: null,
                    responseStatus: 200,
                    expiresAt: getExpiresAt()
                }
            },
            {
                new: true
            }
        );

    return record;
}

// ============================================================
// WAIT FOR COMPLETION
// ============================================================

async function waitForCompletion({
    projectId,
    key,
    timeoutMs = WAIT_TIMEOUT_MS
}) {
    const started =
        Date.now();

    while (
        Date.now() - started <
        timeoutMs
    ) {
        const record =
            await IdempotencyRecord.findOne({
                project: projectId,
                key
            });

        if (!record) {
            return null;
        }

        if (
            record.status === "completed" ||
            record.status === "failed"
        ) {
            return record;
        }

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    WAIT_INTERVAL_MS
                )
        );
    }

    return IdempotencyRecord.findOne({
        project: projectId,
        key
    });
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createRequestHash,
    claim,
    complete,
    fail,
    waitForCompletion,
    retryFailed
};
