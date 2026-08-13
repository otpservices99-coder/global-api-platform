const mongoose = require("mongoose");


// ============================================================
// ACTION SCHEMA
// ============================================================
//
// Global action definition.
//
// Types:
//
// handler
//     → specialized business logic
//     → handlers/<domain>/<action>.js
//
// universal
//     → generic platform operation
//     → Universal Action Engine
//
// The default is "handler" for backward compatibility with
// existing actions.
//
// ============================================================

const actionSchema = new mongoose.Schema(
    {

        // ====================================================
        // PROJECT
        // ====================================================

        project: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Project",

            required: true,

            index: true

        },


        // ====================================================
        // ACTION NAME
        // ====================================================

        name: {

            type: String,

            required: true,

            trim: true,

            index: true

        },


        // ====================================================
        // ACTION TYPE
        // ====================================================
        //
        // handler:
        //     Existing/specialized handler.
        //
        // universal:
        //     Generic dynamic action.
        //
        // Default handler preserves existing behavior.
        //
        // ====================================================

        type: {

            type: String,

            enum: [
                "handler",
                "universal"
            ],

            default: "handler",

            trim: true,

            index: true

        },


        // ====================================================
        // DESCRIPTION
        // ====================================================

        description: {

            type: String,

            default: ""

        },


        // ====================================================
        // ENABLED
        // ====================================================

        enabled: {

            type: Boolean,

            default: true,

            index: true

        },


        // ====================================================
        // CONFIGURATION
        // ====================================================
        //
        // Universal example:
        //
        // {
        //     resource: "rewards",
        //     operation: "update",
        //     id: "{{data.rewardId}}",
        //     data: {
        //         status: "{{data.status}}"
        //     }
        // }
        //
        // Handler example:
        //
        // {
        //     resource: "wallet",
        //     operation: "credit"
        // }
        //
        // ====================================================

        config: {

            type:
                mongoose.Schema.Types.Mixed,

            default: {}

        }

    },

    {
        timestamps: true
    }

);


// ============================================================
// INDEX
// ============================================================

actionSchema.index({

    project: 1,

    name: 1

});


module.exports =
    mongoose.model(
        "Action",
        actionSchema
    );
