const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({

    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        unique: true
    },

    currency: {
        type: String,
        default: "NGN"
    },

    minimumWithdrawal: {
        type: Number,
        default: 1000
    },

    referralBonus: {
        type: Number,
        default: 200
    },

    dailyBonus: {
        type: Number,
        default: 20
    },

    rewardedVideoReward: {
        type: Number,
        default: 15
    },

    siteName: {
        type: String,
        default: ""
    },

    logo: {
        type: String,
        default: ""
    },

    maintenance: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "Setting",
    settingSchema
);
