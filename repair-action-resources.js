require("dotenv").config();

const mongoose = require("mongoose");
const Resource = require("./models/Resource");

const PROJECT_ID = process.argv[2];

if (!PROJECT_ID) {
    console.error(
        "Usage: node repair-action-resources.js <PROJECT_ID>"
    );
    process.exit(1);
}

async function connect() {
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000
    });

    console.log("MONGODB: CONNECTED");
}

async function repair() {
    console.log("============================================================");
    console.log("REPAIRING ACTION RESOURCE CONFIGURATIONS");
    console.log("============================================================");
    console.log("PROJECT:", PROJECT_ID);
    console.log("");

    await connect();

    /*
     * ------------------------------------------------------------
     * REWARD
     * ------------------------------------------------------------
     *
     * Transaction.type does NOT accept:
     *
     *   reward
     *   reward_clawback
     *
     * Valid values include:
     *
     *   earning
     *   bonus
     *   penalty
     *
     * Keep the resource generic. We only change the configured
     * transaction types to values accepted by the actual schema.
     */

    const reward = await Resource.findOne({
        project: PROJECT_ID,
        name: "reward"
    });

    if (reward) {
        reward.settings = reward.settings || {};
        reward.settings.operations =
            reward.settings.operations || {};

        reward.settings.operations.grant = {
            operation: "create",
            data: {
                project: "{{projectId}}",
                user: "{{data.user}}",
                type: "bonus",
                amount: "{{data.amount}}",
                description: "{{data.description}}",
                status: "completed"
            }
        };

        reward.settings.operations.clawback = {
            operation: "create",
            data: {
                project: "{{projectId}}",
                user: "{{data.user}}",
                type: "penalty",
                amount: "{{data.amount}}",
                description: "{{data.description}}",
                status: "completed"
            }
        };

        await reward.save();

        console.log("PASS | reward.grant");
        console.log("PASS | reward.clawback");
    } else {
        console.log("FAIL | reward resource not found");
    }

    /*
     * ------------------------------------------------------------
     * NOTIFICATION
     * ------------------------------------------------------------
     *
     * Notification.title and Notification.user are required.
     *
     * The resource remains completely dynamic; the certification
     * runner will provide the actual runtime values.
     */

    const notification = await Resource.findOne({
        project: PROJECT_ID,
        name: "notification"
    });

    if (notification) {
        notification.settings =
            notification.settings || {};

        notification.settings.operations =
            notification.settings.operations || {};

        notification.settings.operations.broadcast = {
            operation: "create",
            data: {
                project: "{{projectId}}",
                user: "{{data.user}}",
                title: "{{data.title}}",
                message: "{{data.message}}",
                type: "{{data.type}}",
                read: "{{data.read}}"
            }
        };

        notification.settings.operations.send = {
            operation: "create",
            data: {
                project: "{{projectId}}",
                user: "{{data.user}}",
                title: "{{data.title}}",
                message: "{{data.message}}",
                type: "{{data.type}}",
                read: "{{data.read}}"
            }
        };

        await notification.save();

        console.log("PASS | notification.broadcast");
        console.log("PASS | notification.send");
    } else {
        console.log("FAIL | notification resource not found");
    }

    /*
     * ------------------------------------------------------------
     * WITHDRAWAL
     * ------------------------------------------------------------
     *
     * Withdrawal requires:
     *
     * user
     * amount
     * method
     * account
     *
     * Valid initial status:
     *
     * pending
     */

    const withdrawal = await Resource.findOne({
        project: PROJECT_ID,
        name: "withdrawal"
    });

    if (withdrawal) {
        withdrawal.settings =
            withdrawal.settings || {};

        withdrawal.settings.operations =
            withdrawal.settings.operations || {};

        withdrawal.settings.operations.request = {
            operation: "create",
            data: {
                project: "{{projectId}}",
                user: "{{data.user}}",
                amount: "{{data.amount}}",
                method: "{{data.method}}",
                account: "{{data.account}}",
                status: "pending"
            }
        };

        await withdrawal.save();

        console.log("PASS | withdrawal.request");
    } else {
        console.log("FAIL | withdrawal resource not found");
    }

    console.log("");
    console.log("============================================================");
    console.log("ACTION RESOURCE REPAIR COMPLETE");
    console.log("============================================================");
}

(async () => {
    try {
        await repair();
    } catch (error) {
        console.error("");
        console.error("REPAIR FAILED:");
        console.error(error?.stack || error?.message || error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
})();
