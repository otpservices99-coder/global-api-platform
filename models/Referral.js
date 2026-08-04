const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({

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
        required: true,
        index: true
    },

    referralCode: {
        type: String,
        required: true
    },

    reward: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: [
            "pending",
            "completed",
            "cancelled"
        ],
        default: "completed"
    },

    note: {
        type: String,
        default: ""
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Referral", referralSchema);
