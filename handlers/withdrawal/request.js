const mongoose = require("mongoose");

const Withdrawal = require("../../models/Withdrawal");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");

module.exports = {
    name: "withdrawal.request",

    execute: async (ctx) => {
        const projectId = ctx?.projectId || null;

        const userId =
            ctx?.data?.user ||
            ctx?.data?.userId ||
            ctx?.userId ||
            ctx?.event?.entityId ||
            null;

        const amount = Number(ctx?.data?.amount);

        const method =
            typeof ctx?.data?.method === "string"
                ? ctx.data.method.trim()
                : "";

        const details = ctx?.data?.details;

        if (!projectId) {
            throw new Error("Project ID is required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("A positive withdrawal amount is required");
        }

        if (!method) {
            throw new Error("Withdrawal method is required");
        }

        if (
            !details ||
            typeof details !== "object" ||
            Array.isArray(details)
        ) {
            throw new Error("Withdrawal details are required");
        }

        const session = await mongoose.startSession();

        try {
            let result = null;

            await session.withTransaction(async () => {
                /*
                 * Atomically reserve available wallet funds.
                 *
                 * balance decreases.
                 * pendingBalance increases.
                 *
                 * The balance >= amount condition prevents
                 * overdrawing the wallet.
                 */
                const wallet = await Wallet.findOneAndUpdate(
                    {
                        project: projectId,
                        user: userId,
                        balance: { $gte: amount }
                    },
                    {
                        $inc: {
                            balance: -amount,
                            pendingBalance: amount
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!wallet) {
                    throw new Error(
                        "Insufficient wallet balance or wallet not found"
                    );
                }

                /*
                 * Create the pending withdrawal.
                 */
                const withdrawalDocs = await Withdrawal.create(
                    [
                        {
                            project: projectId,
                            user: userId,
                            amount,
                            method,
                            account: details,
                            status: "pending"
                        }
                    ],
                    { session }
                );

                const withdrawal = withdrawalDocs[0];

                if (!withdrawal?._id) {
                    throw new Error(
                        "Withdrawal could not be created"
                    );
                }

                /*
                 * Create the matching pending transaction.
                 */
                const transactionDocs = await Transaction.create(
                    [
                        {
                            project: projectId,
                            user: userId,
                            withdrawal: withdrawal._id,
                            type: "withdrawal_request",
                            amount,
                            description: "Withdrawal request",
                            status: "pending"
                        }
                    ],
                    { session }
                );

                const transaction = transactionDocs[0];

                if (!transaction?._id) {
                    throw new Error(
                        "Withdrawal transaction could not be created"
                    );
                }

                result = {
                    success: true,
                    withdrawal,
                    transaction,
                    wallet
                };
            });

            return result;

        } finally {
            await session.endSession();
        }
    }
};
