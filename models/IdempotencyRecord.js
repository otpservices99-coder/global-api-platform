const mongoose = require("mongoose");

const idempotencyRecordSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        key: {
            type: String,
            required: true,
            trim: true,
            maxlength: 512
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        requestHash: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "processing",
                "completed",
                "failed"
            ],
            default: "processing",
            index: true
        },

        responseStatus: {
            type: Number,
            default: 200
        },

        responseBody: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        errorMessage: {
            type: String,
            default: null
        },

        expiresAt: {
          type: Date
        }
    },
    {
        timestamps: true
    }
);

// ============================================================
// CRITICAL CONCURRENCY PROTECTION
// ============================================================
//
// Only one idempotency record can exist for:
//
//     project + key
//
// This is what prevents two simultaneous requests from both
// becoming owners of the same idempotency key.
//
// ============================================================

idempotencyRecordSchema.index(
    {
        project: 1,
        key: 1
    },
    {
        unique: true
    }
);

// ============================================================
// TTL
// ============================================================
//
// MongoDB automatically removes records after expiresAt.
//
// The service controls expiresAt, so the TTL remains configurable.
// ============================================================

idempotencyRecordSchema.index(
    {
        expiresAt: 1
    },
    {
        expireAfterSeconds: 0
    }
);

module.exports = mongoose.model(
    "IdempotencyRecord",
    idempotencyRecordSchema
);
