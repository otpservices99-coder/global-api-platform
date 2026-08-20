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

        /*
         * Device fingerprint supplied by the client.
         *
         * This is intentionally NOT unique by itself.
         *
         * Multiple accounts may exist on the same device when
         * the authenticated requester is a super admin.
         */
        deviceId: {
            type: String,
            trim: true,
            default: null,
            index: true
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
 * DEVICE INDEX
 * ============================================================
 *
 * Device restriction is enforced by the registration controller:
 *
 *     project + deviceId
 *
 * We intentionally do NOT create a unique MongoDB index because
 * super admins must be able to create multiple accounts from
 * the same device.
 */

userSchema.index({
    project: 1,
    deviceId: 1
});


/*
 * ============================================================
 * AUTOMATIC WALLET CREATION
 * ============================================================
 *
 * Every normal User.save()/User.create() operation for a
 * project user automatically ensures the wallet exists.
 *
 * This preserves the existing wallet architecture.
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
