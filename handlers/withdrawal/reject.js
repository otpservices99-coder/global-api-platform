const mongoose = require("mongoose");

const Withdrawal = require("../../models/Withdrawal");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");

const audit = require("../../services/auditService");

module.exports = {

    name: "withdrawal.reject",

    execute: async (ctx) => {

        const projectId =
            ctx?.projectId ||
            ctx?.project?._id ||
            ctx?.event?.project;

        const actorId =
            ctx?.actorId || null;

        const data =
            ctx?.data || {};

        const withdrawalId =
            data.withdrawalId ||
            data.withdrawal ||
            data.id ||
            data._id;

        if (!projectId) {
            return {
                success: false,
                message: "Project ID is required"
            };
        }

        if (!withdrawalId) {
            return {
                success: false,
                message: "Withdrawal ID is required"
            };
        }

        const session =
            await mongoose.startSession();

        try {

            let rejectedWithdrawal = null;

            await session.withTransaction(async () => {

                const withdrawal =
                    await Withdrawal.findOne({
                        _id: withdrawalId,
                        project: projectId
                    }).session(session);

                if (!withdrawal) {
                    throw new Error(
                        "Withdrawal not found"
                    );
                }

                if (withdrawal.status !== "pending") {
                    throw new Error(
                        "Withdrawal already processed"
                    );
                }

                const amount =
                    Number(withdrawal.amount);

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {
                    throw new Error(
                        "Invalid withdrawal amount"
                    );
                }

                const wallet =
                    await Wallet.findOne({
                        project: projectId,
                        user: withdrawal.user
                    }).session(session);

                if (!wallet) {
                    throw new Error(
                        "Wallet not found"
                    );
                }

                if (
                    Number(wallet.pendingBalance) < amount
                ) {
                    throw new Error(
                        "Insufficient pending balance"
                    );
                }

                /*
                 * Release the reserved withdrawal amount.
                 */
                wallet.balance =
                    Number(wallet.balance) + amount;

                wallet.pendingBalance =
                    Number(wallet.pendingBalance) - amount;

                await wallet.save({
                    session
                });

                /*
                 * Mark withdrawal rejected.
                 */
                withdrawal.status =
                    "rejected";

                withdrawal.processedAt =
                    new Date();

                withdrawal.processedBy =
                    actorId || null;

                withdrawal.rejectionReason =
                    data.reason ||
                    data.rejectionReason ||
                    "Withdrawal rejected";

                await withdrawal.save({
                    session
                });

                /*
                 * Update the associated transaction.
                 */
                const transaction =
                    await Transaction.findOne({
                        project: projectId,
                        withdrawal: withdrawal._id
                    }).session(session);

                if (transaction) {

                    transaction.status =
                        "rejected";

                    await transaction.save({
                        session
                    });

                }

                rejectedWithdrawal =
                    withdrawal.toObject();

            });

            /*
             * Audit is intentionally non-fatal.
             */
            try {

                if (
                    audit &&
                    typeof audit === "function"
                ) {

                    await audit({
                        project: projectId,
                        actor: actorId,
                        action: "withdrawal.reject",
                        resource: "withdrawal",
                        resourceId: withdrawalId,
                        metadata: {
                            amount:
                                rejectedWithdrawal.amount,
                            status: "rejected"
                        }
                    });

                }

            } catch (auditError) {

                console.error(
                    "WITHDRAWAL REJECTION AUDIT ERROR:",
                    auditError.message
                );

            }

            return {
                success: true,
                withdrawal:
                    rejectedWithdrawal
            };

        } catch (error) {

            return {
                success: false,
                message: error.message
            };

        } finally {

            await session.endSession();

        }

    }

};
