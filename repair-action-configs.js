require("dotenv").config();

const mongoose = require("mongoose");
const Resource = require("./models/Resource");

const PROJECT_ID = process.argv[2];

if (!PROJECT_ID) {
    console.error("Usage: node repair-action-configs.js <PROJECT_ID>");
    process.exit(1);
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("============================================================");
    console.log("        REPAIRING ACTION RESOURCE CONFIGURATIONS");
    console.log("============================================================");
    console.log("PROJECT:", PROJECT_ID);
    console.log("");

    /*
     * ----------------------------------------------------------
     * REWARD
     * ----------------------------------------------------------
     *
     * Transaction.type does not allow:
     *
     *   reward
     *   reward_clawback
     *
     * Valid types include:
     *
     *   bonus
     *   penalty
     *
     * Therefore reward actions map to those generic
     * transaction types.
     */

    const reward = await Resource.findOne({
        project: PROJECT_ID,
        name: "reward"
    });

    if (!reward) {
        throw new Error("Resource 'reward' not found");
    }

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

    /*
     * ----------------------------------------------------------
     * WITHDRAWAL
     * ----------------------------------------------------------
     *
     * Withdrawal.status accepts:
     *
     * pending
     * approved
     * rejected
     * hold
     *
     * Request must therefore create a pending withdrawal.
     */

    const withdrawal = await Resource.findOne({
        project: PROJECT_ID,
        name: "withdrawal"
    });

    if (!withdrawal) {
        throw new Error("Resource 'withdrawal' not found");
    }

    withdrawal.settings.operations.request = {
        operation: "create",
        data: "{{data}}"
    };

    await withdrawal.save();

    console.log("PASS | withdrawal.request");

    /*
     * ----------------------------------------------------------
     * NOTIFICATION
     * ----------------------------------------------------------
     *
     * Notification.title and Notification.user are required.
     *
     * The operation configuration already resolves these
     * dynamically from incoming action data, so no engine
     * changes are necessary.
     */

    const notification = await Resource.findOne({
        project: PROJECT_ID,
        name: "notification"
    });

    if (!notification) {
        throw new Error("Resource 'notification' not found");
    }

    notification.settings.operations.broadcast = {
        operation: "create",
        data: "{{data}}"
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

    console.log("");
    console.log("============================================================");
    console.log("ACTION CONFIGURATION REPAIR COMPLETE");
    console.log("============================================================");

    await mongoose.disconnect();
}

main().catch(async error => {
    console.error("");
    console.error("REPAIR FAILED:");
    console.error(error.stack || error);

    await mongoose.disconnect().catch(() => {});

    process.exit(1);
});
