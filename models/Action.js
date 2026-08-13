const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        description: {
            type: String,
            default: ""
        },

        enabled: {
            type: Boolean,
            default: true,
            index: true
        },

        /*
         * Everything about execution lives in config.
         *
         * Example:
         *
         * {
         *   resource: "products",
         *   operation: "update",
         *   id: "{{data.id}}",
         *   data: {
         *      status: "{{data.status}}"
         *   }
         * }
         *
         * Or:
         *
         * {
         *   handler: "some.custom.handler"
         * }
         */
        config: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

actionSchema.index({
    project: 1,
    name: 1
});

module.exports = mongoose.model("Action", actionSchema);
