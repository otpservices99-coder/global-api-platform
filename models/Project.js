const mongoose = require("mongoose");
const crypto = require("crypto");

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        default: () => crypto.randomBytes(32).toString("hex")
    },

    name: {
        type: String,
        default: "production"
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    lastUsed: {
        type: Date,
        default: null
    },

    status: {
        type: String,
        enum: ["active", "revoked"],
        default: "active"
    }
}, { _id: true });

const projectSchema = new mongoose.Schema({

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    domains: [{
        type: String
    }],

    allowedOrigins: [{
        type: String
    }],

    apiKeys: {
        type: [apiKeySchema],
        default: []
    },

    webhook: {
        enabled: {
            type: Boolean,
            default: false
        },
        url: {
            type: String,
            default: ""
        }
    },

    status: {
        type: String,
        enum: ["active", "disabled"],
        default: "active"
    },

    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Project", projectSchema);
