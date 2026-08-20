const mongoose = require("mongoose");
const Wallet = require("./Wallet");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        platformRole: {
            type: String,
            enum: [
                "super_admin",
                "user"
            ],
            default: "user"
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true
        },

        /*
         * Device fingerprint supplied during registration.
         *
         * IMPORTANT:
         * This is intentionally NOT globally unique.
         *
         * Registration logic enforces:
         *
         *   normal user + same project + same deviceId
         *       => rejected
         *
         *   super_admin + same deviceId
         *       => allowed
         *
         * This preserves support/admin flexibility.
         */
        deviceId: {
            type: String,
            default: null,
            trim: true,
            index: true
        },

        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            default: null
        },

        status: {
            type: String,
            enum: [
                "active",
                "suspended",
                "blocked"
            ],
            default: "active"
        },

        profile: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        lastLogin: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


/*
 * ============================================================
 * AUTOMATIC WALLET CREATION
 * ============================================================
 *
 * Preserve the existing wallet behavior.
 *
 * Every normal User.create() / save() operation creates or
 * ensures the corresponding project wallet.
 */
userSchema.post("save", async function(doc) {

    try {

        if (!doc.project) {
            return;
        }

        await Wallet.updateOne(
            {
                project: doc.project,
                user: doc._id
            },
            {
                $setOnInsert: {
                    project: doc.project,
                    user: doc._id,

                    balance: 0,
                    pendingBalance: 0,
                    totalEarned: 0,
                    totalWithdrawn: 0,

                    currency: "NGN",
                    metadata: {}
                }
            },
            {
                upsert: true
            }
        );

    } catch (error) {

        console.error(
            "USER WALLET ENSURE ERROR:",
            error
        );
    }
});


module.exports = mongoose.model(
    "User",
    userSchema
);
