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
 * Any normal User.create() / user.save() operation that creates
 * a user will automatically ensure that the user has a wallet.
 *
 * This means registration, admin-created users, OAuth code that
 * uses save(), and seed code using normal User documents all get
 * the same wallet behavior.
 */
userSchema.post("save", async function(doc) {

    try {

        /*
         * Users without a project cannot have a project wallet.
         */
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

        /*
         * Do not silently hide wallet creation errors.
         *
         * The user itself has already been saved, but the error
         * is logged so deployment/debugging can see the problem.
         */
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
