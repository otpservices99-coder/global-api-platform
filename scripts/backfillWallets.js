require("dotenv").config();

const mongoose = require("mongoose");

const User =
    require("../models/User");

const Wallet =
    require("../models/Wallet");


async function main() {

    /*
     * ------------------------------------------------------------
     * CONNECT
     * ------------------------------------------------------------
     */
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing"
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI
    );

    console.log(
        "MongoDB connected"
    );

    /*
     * ------------------------------------------------------------
     * FIND ALL PROJECT USERS
     * ------------------------------------------------------------
     */
    const users =
        await User.find({
            project: {
                $ne: null
            }
        })
        .select(
            "_id project username email"
        )
        .lean();

    console.log(
        `Found ${users.length} project users`
    );

    let created = 0;
    let existing = 0;
    let skipped = 0;

    /*
     * ------------------------------------------------------------
     * ENSURE WALLET FOR EACH USER
     * ------------------------------------------------------------
     */
    for (const user of users) {

        if (!user.project) {

            skipped++;

            continue;
        }

        const result =
            await Wallet.updateOne(
                {
                    project:
                        user.project,

                    user:
                        user._id
                },
                {
                    $setOnInsert: {

                        project:
                            user.project,

                        user:
                            user._id,

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

        if (result.upsertedCount > 0) {

            created++;

            console.log(
                `CREATED wallet for ${user.username || user.email} (${user._id})`
            );

        } else {

            existing++;
        }
    }

    /*
     * ------------------------------------------------------------
     * SUMMARY
     * ------------------------------------------------------------
     */
    console.log("");
    console.log(
        "===== WALLET BACKFILL COMPLETE ====="
    );

    console.log(
        "Users:",
        users.length
    );

    console.log(
        "Wallets created:",
        created
    );

    console.log(
        "Wallets already existing:",
        existing
    );

    console.log(
        "Skipped:",
        skipped
    );

}


main()
    .catch(error => {

        console.error(
            "WALLET BACKFILL ERROR:",
            error
        );

        process.exitCode = 1;

    })
    .finally(async () => {

        await mongoose.disconnect();

    });
