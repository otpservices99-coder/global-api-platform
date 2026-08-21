const mongoose = require("mongoose");


const referralSchema =
    new mongoose.Schema(
        {
            project: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "Project",
                required: true,
                index: true
            },

            referrer: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                index: true
            },

            referredUser: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
                unique: true,
                index: true
            },

            rewardAmount: {
                type: Number,
                required: true,
                min: 0
            },

            status: {
                type: String,
                enum: [
                    "pending",
                    "completed",
                    "rejected"
                ],
                default: "completed"
            },

            metadata: {
                type:
                    mongoose.Schema.Types.Mixed,
                default: {}
            }
        },
        {
            timestamps: true
        }
    );


/*
 * ============================================================
 * REFERRAL INDEX
 * ============================================================
 */

referralSchema.index({
    project: 1,
    referrer: 1,
    createdAt: -1
});


/*
 * ============================================================
 * MODEL
 * ============================================================
 */

module.exports =
    mongoose.model(
        "Referral",
        referralSchema
    );
