const mongoose = require("mongoose");

const earnSessionSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        provider: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        placement: {
            type: String,
            default: null,
            trim: true
        },

        userReward: {
            type: Number,
            required: true,
            min: 0
        },

        // ============================================
        // AD CLICK / VIEW TRACKING
        // ============================================

        clickStatus: {
            type: String,
            enum: [
                "not_clicked",
                "clicked",
                "returned",
                "completed",
                "expired",
                "cancelled"
            ],
            default: "not_clicked",
            index: true
        },

        clickedAt: {
            type: Date,
            default: null
        },

        returnedAt: {
            type: Date,
            default: null
        },

        // URL that was opened for this session.
        // This is for tracking only.
        adUrl: {
            type: String,
            default: null,
            trim: true
        },

        // ============================================
        // EXISTING SESSION STATE
        // ============================================

        status: {
            type: String,
            enum: [
                "pending",
                "completed",
                "expired",
                "cancelled"
            ],
            default: "pending",
            index: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

earnSessionSchema.index({
    project: 1,
    user: 1,
    status: 1,
    createdAt: -1
});

earnSessionSchema.index({
    project: 1,
    user: 1,
    clickStatus: 1,
    createdAt: -1
});

earnSessionSchema.index({
    expiresAt: 1
});

module.exports = mongoose.model(
    "EarnSession",
    earnSessionSchema
);
