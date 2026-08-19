const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
    {
        // ============================================================
        // PROJECT
        // ============================================================

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        // ============================================================
        // ACTION NAME
        // ============================================================

        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        // ============================================================
        // DESCRIPTION
        // ============================================================

        description: {
            type: String,
            default: ""
        },

        // ============================================================
        // EXECUTION TYPE
        // ============================================================
        //
        // handler:
        //     Execute a dynamically registered handler.
        //
        // universal:
        //     Execute Resource -> Operation configuration.
        //
        // The field is intentionally optional so existing actions
        // that rely entirely on config.resource/config.operation
        // continue working.
        //
        // ============================================================

        type: {
            type: String,
            enum: [
                "handler",
                "universal"
            ],
            default: "universal",
            index: true
        },

        // ============================================================
        // ENABLED
        // ============================================================

        enabled: {
            type: Boolean,
            default: true,
            index: true
        },

        // ============================================================
        // EXECUTION CONFIGURATION
        // ============================================================
        //
        // Everything else about execution remains dynamic and lives
        // inside config.
        //
        // Examples:
        //
        // Resource action:
        //
        // {
        //     resource: "products",
        //     operation: "update",
        //     id: "{{data.id}}",
        //     data: {
        //         status: "{{data.status}}"
        //     }
        // }
        //
        // Handler action:
        //
        // {
        //     handler: "wallet.credit"
        // }
        //
        // ============================================================

        config: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// ================================================================
// ONE ACTION NAME PER PROJECT
// ================================================================

actionSchema.index({
    project: 1,
    name: 1
});

// ================================================================
// EXPORT
// ================================================================

module.exports = mongoose.model(
    "Action",
    actionSchema
);
