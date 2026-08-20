const mongoose = require("mongoose");

const Withdrawal =
    require("../../models/Withdrawal");

const Transaction =
    require("../../models/Transaction");

const Wallet =
    require("../../models/Wallet");

const audit =
    require("../../services/auditService");

module.exports = {

    name: "withdrawal.approve",

    execute: async (ctx) => {

        const withdrawalId =
            ctx?.data?.withdrawalId;

        const projectId =
            ctx?.projectId;

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

                    // ====================================================
                    // FIND WITHDRAWAL
                    // ====================================================

                    const withdrawal =
                        await Withdrawal.findOne({
                            _id:
                                withdrawalId,
                            project:
                                projectId
                        }).session(
                            session
                        );

                    if (!withdrawal) {
                        throw new Error(
                            "Withdrawal not found"
                        );
                    }

                    // ====================================================
                    // BUSINESS IDEMPOTENCY
                    // ====================================================
                    //
                    // If already approved, do NOT:
                    //
                    // - change wallet
                    // - increase totalWithdrawn
                    // - create another transaction
                    //
                    // Simply return the existing approved withdrawal.
                    // ====================================================

                    if (
                        withdrawal.status ===
                        "approved"
                    ) {

                        alreadyApproved =
                            true;

                        approvedWithdrawal =
                            withdrawal;

                        return;
                    }

                    // ====================================================
                    // OTHER TERMINAL STATES
                    // ====================================================

                    if (
                        withdrawal.status !==
                        "pending"
                    ) {
                        throw new Error(
                            "Withdrawal already processed"
                        );
                    }

                    // ====================================================
                    // VALIDATE AMOUNT
                    // ====================================================

                    const amount =
                        Number(
                            withdrawal.amount
                        );

                    if (
                        !Number.isFinite(
                            amount
                        ) ||
                        amount <= 0
                    ) {
                        throw new Error(
                            "Invalid withdrawal amount"
                        );
                    }

                    // ====================================================
                    // FIND REAL WALLET
                    // ====================================================

                    const wallet =
                        await Wallet.findOne({
                            project:
                                projectId,
                            user:
                                withdrawal.user
                        }).session(
                            session
                        );

                    if (!wallet) {
                        throw new Error(
                            "Wallet not found"
                        );
                    }

                    // ====================================================
                    // VERIFY RESERVED MONEY
                    // ====================================================

                    if (
                        Number(
                            wallet.pendingBalance ||
                            0
                        ) < amount
                    ) {
                        throw new Error(
                            "Insufficient pending balance"
                        );
                    }

                    // ====================================================
                    // COMPLETE RESERVATION
                    // ====================================================
                    //
                    // pendingBalance -= amount
                    // totalWithdrawn += amount
                    //
                    // balance is NOT restored.
                    // ====================================================

                    wallet.pendingBalance =
                        Number(
                            wallet.pendingBalance ||
                            0
                        ) - amount;

                    wallet.totalWithdrawn =
                        Number(
                            wallet.totalWithdrawn ||
                            0
                        ) + amount;

                    await wallet.save({
                        session
                    });

                    // ====================================================
                    // MARK APPROVED
                    // ====================================================

                    withdrawal.status =
                        "approved";

                    withdrawal.processedAt =
                        new Date();

                    withdrawal.processedBy =
                        actorId;

                    await withdrawal.save({
                        session
                    });

                    // ====================================================
                    // TRANSACTION
                    // ====================================================

                    const transaction =
                        await Transaction.findOne({
                            project:
                                projectId,
                            user:
                                withdrawal.user,
                            withdrawal:
                                withdrawal._id,
                            type:
                                "withdrawal_request"
                        }).session(
                            session
                        );

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
                            [
                                {
                                    project:
                                        projectId,

                                    user:
                                        withdrawal.user,

                                    withdrawal:
                                        withdrawal._id,

                                    type:
                                        "withdrawal",

                                    amount,

                                    description:
                                        "Withdrawal approved",

                                    status:
                                        "completed"
                                }
                            ],
                            {
                                session
                            }
                        );
                    }

                    approvedWithdrawal =
                        withdrawal;
                }
            );

            // ============================================================
            // AUDIT
            // ============================================================
            //
            // Do not create a second financial effect.
            // We still return success for an already-approved request.
            // ============================================================

            if (
                !alreadyApproved
            ) {

                await audit.log({

                    project:
                        projectId,

                    actor:
                        actorId,

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

            // ============================================================
            // SUCCESS
            // ============================================================

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
