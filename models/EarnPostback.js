const mongoose = require("mongoose");

const earnPostbackSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        provider: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        externalTxId: {
            type: String,
            required: true,
            trim: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EarnSession",
            default: null,
            index: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "processing",
                "completed",
                "rejected"
            ],
            default: "processing",
            index: true
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        rawPostback: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);


// ============================================================
// DUPLICATE PROTECTION
// ============================================================
//
// One provider transaction can only ever belong to one
// project/provider combination.
//
// This is the database-level protection against:
//
//   same postback -> two credits
//
// ============================================================

earnPostbackSchema.index(
    {
        project: 1,
        provider: 1,
        externalTxId: 1
    },
    {
        unique: true
    }
);


module.exports = mongoose.model(
    "EarnPostback",
    earnPostbackSchema
);
