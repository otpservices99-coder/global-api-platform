const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
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

        withdrawal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Withdrawal",
            default: null,
            index: true
        },

        type: {
            type: String,
            enum: [
                "earning",
                "withdrawal_request",
                "withdrawal",
                "deposit",
                "bonus",
                "penalty",
                "refund"
            ],
            required: true
        },

        amount: {
            type: Number,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "completed",
                "rejected",
                "failed",
                "cancelled"
            ],
            default: "completed"
        }
    },
    {
        timestamps: true
    }
);

transactionSchema.index({
    project: 1,
    user: 1,
    createdAt: -1
});

transactionSchema.index({
    project: 1,
    withdrawal: 1
});

module.exports = mongoose.model(
    "Transaction",
    transactionSchema
);
