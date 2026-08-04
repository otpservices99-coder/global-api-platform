const mongoose = require("mongoose");

const referralCommissionSchema = new mongoose.Schema({

    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },

    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    referredUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        required: true
    },

    rewardAmount: {
        type: Number,
        required: true
    },

    commissionPercent: {
        type: Number,
        required: true
    },

    commissionAmount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "paid",
            "cancelled"
        ],
        default: "paid"
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "ReferralCommission",
    referralCommissionSchema
);
