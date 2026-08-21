const mongoose = require("mongoose");

const referralConfigSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            unique: true,
            index: true
        },

        enabled: {
            type: Boolean,
            default: true
        },

        rewardPerReferral: {
            type: Number,
            default: 1,
            min: 0
        },

        currency: {
            type: String,
            default: "NGN",
            trim: true
        },

        maxReferralsPerUser: {
            type: Number,
            default: null,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ReferralConfig",
    referralConfigSchema
);
