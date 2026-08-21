const mongoose = require("mongoose");

const sponsoredTaskSubmissionSchema =
    new mongoose.Schema(
        {
            project: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Project",
                required: true,
                index: true
            },

            task: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "SponsoredTask",
                required: true,
                index: true
            },

            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true
            },

            status: {
                type: String,
                enum: [
                    "pending",
                    "approved",
                    "rejected",
                    "clawed_back"
                ],
                default: "pending",
                index: true
            },

            proofUrl: {
                type: String,
                default: ""
            },

            proofType: {
                type: String,
                enum: [
                    "image",
                    "url",
                    "text",
                    "other"
                ],
                default: "image"
            },

            proofHash: {
                type: String,
                default: "",
                index: true
            },

            targetUrl: {
                type: String,
                default: ""
            },

            verificationMode: {
                type: String,
                default: "manual"
            },

            rejectionReason: {
                type: String,
                default: ""
            },

            reviewNote: {
                type: String,
                default: ""
            },

            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },

            reviewedAt: {
                type: Date,
                default: null
            },

            rewardAmount: {
                type: Number,
                default: 0
            },

            currency: {
                type: String,
                default: "NGN"
            },

            transaction: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Transaction",
                default: null
            },

            attemptNumber: {
                type: Number,
                default: 1
            },

            fraudScore: {
                type: Number,
                default: 0,
                min: 0
            },

            fraudFlags: {
                type: [String],
                default: []
            },

            deviceId: {
                type: String,
                default: ""
            },

            ipHash: {
                type: String,
                default: ""
            },

            userAgent: {
                type: String,
                default: ""
            },

            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            }
        },
        {
            timestamps: true
        }
    );

sponsoredTaskSubmissionSchema.index({
    project: 1,
    task: 1,
    user: 1,
    createdAt: -1
});

sponsoredTaskSubmissionSchema.index({
    project: 1,
    user: 1,
    status: 1
});

module.exports =
    mongoose.model(
        "SponsoredTaskSubmission",
        sponsoredTaskSubmissionSchema
    );
