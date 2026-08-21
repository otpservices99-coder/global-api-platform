const mongoose = require("mongoose");

const sponsoredTaskSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        imageUrl: {
            type: String,
            default: "",
            trim: true
        },

        targetUrl: {
            type: String,
            required: true,
            trim: true
        },

        platform: {
            type: String,
            default: "other",
            trim: true,
            lowercase: true
        },

        rewardAmount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "NGN",
            trim: true,
            uppercase: true
        },

        needsProof: {
            type: Boolean,
            default: true
        },

        verificationMode: {
            type: String,
            enum: [
                "manual",
                "link_visit",
                "platform_api",
                "hybrid"
            ],
            default: "manual"
        },

        maxCompletions: {
            type: Number,
            default: null,
            min: 1
        },

        completionCount: {
            type: Number,
            default: 0,
            min: 0
        },

        active: {
            type: Boolean,
            default: true,
            index: true
        },

        startsAt: {
            type: Date,
            default: null
        },

        endsAt: {
            type: Date,
            default: null
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

sponsoredTaskSchema.index({
    project: 1,
    active: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "SponsoredTask",
    sponsoredTaskSchema
);
