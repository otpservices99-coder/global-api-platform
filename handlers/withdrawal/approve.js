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
    createWithdrawalApprovedNotification
} =
    require("../../services/notificationService");

module.exports = {

    name: "withdrawal.approve",

    execute: async (ctx) => {

        const withdrawalId =
            ctx?.data?.withdrawalId;

        const projectId =
            ctx?.projectId ||
            ctx?.project?._id ||
            ctx?.event?.project;

        const actorId =
            ctx?.actorId || null;

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

            let approvedWithdrawal = null;
            let alreadyApproved = false;

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
                        withdrawal.status ===
                        "approved"
                    ) {
                        alreadyApproved = true;
                        approvedWithdrawal =
                            withdrawal;

                        return;
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

                    wallet.pendingBalance =
                        Number(
                            wallet.pendingBalance || 0
                        ) - amount;

                    wallet.totalWithdrawn =
                        Number(
                            wallet.totalWithdrawn || 0
                        ) + amount;

                    await wallet.save({
                        session
                    });

                    withdrawal.status =
                        "approved";

                    withdrawal.processedAt =
                        new Date();

                    withdrawal.processedBy =
                        actorId;

                    await withdrawal.save({
                        session
                    });

                    const transaction =
                        await Transaction.findOne({
                            project: projectId,
                            user: withdrawal.user,
                            withdrawal: withdrawal._id,
                            type: "withdrawal_request"
                        }).session(session);

                    if (transaction) {

                        transaction.type =
                            "withdrawal";

                        transaction.status =
                            "completed";

                        transaction.amount =
                            amount;

                        transaction.description =
                            "Withdrawal approved";

                        await transaction.save({
                            session
                        });

                    } else {

                        await Transaction.create(
                            [{
                                project: projectId,
                                user: withdrawal.user,
                                withdrawal:
                                    withdrawal._id,
                                type: "withdrawal",
                                amount,
                                description:
                                    "Withdrawal approved",
                                status: "completed"
                            }],
                            {
                                session
                            }
                        );
                    }

                    await createWithdrawalApprovedNotification({
                        projectId,
                        withdrawal,
                        session
                    });

                    approvedWithdrawal =
                        withdrawal;
                }
            );

            if (!alreadyApproved) {

                await audit.log({

                    project: projectId,

                    actor: actorId,

                    user:
                        approvedWithdrawal.user,

                    action:
                        "withdrawal.approved",

                    resource:
                        "withdrawal",

                    metadata: {

                        withdrawalId:
                            approvedWithdrawal._id,

                        amount:
                            approvedWithdrawal.amount
                    },

                    req:
                        ctx?.req
                });
            }

            return {

                success: true,

                withdrawal:
                    approvedWithdrawal,

                ...(alreadyApproved
                    ? {
                        idempotent: true
                    }
                    : {})
            };

        } finally {

            await session.endSession();

        }
    }
};
