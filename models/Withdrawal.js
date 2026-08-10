const mongoose = require("mongoose");


const withdrawalSchema = new mongoose.Schema(
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


    amount: {
        type: Number,
        required: true,
        min: 0
    },


    method: {
        type: String,
        required: true,
        trim: true
    },


    account: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },


    status: {
        type: String,
        enum: [
            "pending",
            "approved",
            "rejected"
        ],
        default: "pending",
        index: true
    },


    processedAt: {
        type: Date,
        default: null
    },


    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },


    rejectionReason: {
        type: String,
        default: null
    }

},
{
    timestamps: true
});


// Indexes for faster admin queries

withdrawalSchema.index({
    project: 1,
    user: 1,
    createdAt: -1
});


withdrawalSchema.index({
    project: 1,
    status: 1,
    createdAt: -1
});


module.exports = mongoose.model(
    "Withdrawal",
    withdrawalSchema
);
