const mongoose = require("mongoose");

const Withdrawal =
    require("../../models/Withdrawal");

const Transaction =
    require("../../models/Transaction");

const Wallet =
    require("../../models/Wallet");

const audit =
    require("../../services/auditService");

const {
    createWithdrawalRejectedNotification
} =
    require("../../services/notificationService");

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
            throw new Error(
                "Project ID is required"
            );
        }

        if (!withdrawalId) {
            throw new Error(
                "Withdrawal ID is required"
            );
        }

        const session =
            await mongoose.startSession();

        try {

            let rejectedWithdrawal = null;

            await session.withTransaction(
                async () => {

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

                    if (
                        withdrawal.status !==
                        "pending"
                    ) {
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
                        Number(
                            wallet.pendingBalance || 0
                        ) < amount
                    ) {
                        throw new Error(
                            "Insufficient pending balance"
                        );
                    }

                    wallet.balance =
                        Number(
                            wallet.balance || 0
                        ) + amount;

                    wallet.pendingBalance =
                        Number(
                            wallet.pendingBalance || 0
                        ) - amount;

                    await wallet.save({
                        session
                    });

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

                    const transaction =
                        await Transaction.findOne({
                            project: projectId,
                            withdrawal:
                                withdrawal._id
                        }).session(session);

                    if (transaction) {

                        transaction.status =
                            "rejected";

                        await transaction.save({
                            session
                        });
                    }

                    await createWithdrawalRejectedNotification({
                        projectId,
                        withdrawal,
                        session
                    });

                    rejectedWithdrawal =
                        withdrawal.toObject();
                }
            );

            try {

                await audit.log({

                    project: projectId,

                    actor: actorId,

                    user:
                        rejectedWithdrawal.user,

                    action:
                        "withdrawal.rejected",

                    resource:
                        "withdrawal",

                    resourceId:
                        withdrawalId,

                    metadata: {

                        amount:
                            rejectedWithdrawal.amount,

                        status:
                            "rejected",

                        reason:
                            rejectedWithdrawal
                                .rejectionReason
                    }
                });

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

        } finally {

            await session.endSession();

        }
    }
};
