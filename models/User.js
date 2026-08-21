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

        deviceId: {
            type: String,
            trim: true,
            default: null,
            index: true
        },

        /*
         * ========================================================
         * REFERRAL
         * ========================================================
         *
         * referralCode:
         * The code this user can give to other people.
         *
         * referredBy:
         * The user who referred this account.
         *
         * These are project-scoped.
         */

        referralCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
            index: true
        },

        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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
 */

userSchema.index({
    project: 1,
    deviceId: 1
});


/*
 * ============================================================
 * REFERRAL CODE INDEX
 * ============================================================
 *
 * A code must identify one user.
 *
 * Sparse allows existing users without a referralCode
 * to remain valid while codes are generated.
 */

userSchema.index(
    {
        project: 1,
        referralCode: 1
    },
    {
        unique: true,
        sparse: true
    }
);


/*
 * ============================================================
 * AUTOMATIC WALLET CREATION
 * ============================================================
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
