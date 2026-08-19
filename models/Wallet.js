const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
    {
        // ============================================================
        // OWNERSHIP
        // ============================================================
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

        // ============================================================
        // CORE WALLET VALUES
        // ============================================================
        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        pendingBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        totalEarned: {
            type: Number,
            default: 0,
            min: 0
        },

        totalWithdrawn: {
            type: Number,
            default: 0,
            min: 0
        },

        // ============================================================
        // CURRENCY
        // ============================================================
        currency: {
            type: String,
            default: "NGN",
            trim: true,
            uppercase: true
        },

        // ============================================================
        // EXTENSIBLE WALLET DATA
        // ============================================================
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// ================================================================
// ONE WALLET PER USER PER PROJECT
// ================================================================
walletSchema.index(
    {
        project: 1,
        user: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "Wallet",
    walletSchema
);
