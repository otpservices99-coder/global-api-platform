const mongoose = require("mongoose");

const placementSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true
        },

        title: {
            type: String,
            default: ""
        },

        type: {
            type: String,
            enum: ["ad", "survey"],
            default: "ad"
        },

        enabled: {
            type: Boolean,
            default: true
        }
    },
    {
        _id: false
    }
);

const providerSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true
        },

        enabled: {
            type: Boolean,
            default: false
        },

        userReward: {
            type: Number,
            required: true,
            min: 0
        },

        postbackSecret: {
            type: String,
            required: true,
            select: false
        },

        placements: {
            type: [placementSchema],
            default: []
        }
    },
    {
        _id: false
    }
);

const earnProviderConfigSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            unique: true,
            index: true
        },

        providers: {
            type: [providerSchema],
            default: []
        },

        globalDailyEarnCap: {
            type: Number,
            default: null,
            min: 0
        },

        currency: {
            type: String,
            default: "NGN",
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "EarnProviderConfig",
    earnProviderConfigSchema
);
