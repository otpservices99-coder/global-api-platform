const mongoose = require("mongoose");

const Withdrawal =
    require("../../models/Withdrawal");

const Transaction =
    require("../../models/Transaction");

const Wallet =
    require("../../models/Wallet");

const audit =
    require("../../services/auditService");

const notificationService =
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

            return {

                success:
                    false,

                message:
                    "Project ID is required"

            };

        }


        if (!withdrawalId) {

            return {

                success:
                    false,

                message:
                    "Withdrawal ID is required"

            };

        }


        const session =
            await mongoose.startSession();


        try {

            let rejectedWithdrawal =
                null;


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
                    // VALIDATE STATE
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
                    // FIND WALLET
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
                    // RELEASE RESERVED MONEY
                    // ====================================================

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


                    // ====================================================
                    // MARK REJECTED
                    // ====================================================

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


                    // ====================================================
                    // UPDATE TRANSACTION
                    // ====================================================

                    const transaction =
                        await Transaction.findOne({

                            project:
                                projectId,

                            withdrawal:
                                withdrawal._id

                        }).session(
                            session
                        );


                    if (transaction) {

                        transaction.status =
                            "rejected";


                        await transaction.save({
                            session
                        });

                    }


                    // ====================================================
                    // USER NOTIFICATION
                    // ====================================================

                    await notificationService.createNotification({

                        projectId,

                        userId:
                            withdrawal.user,

                        title:
                            "Withdrawal rejected",

                        message:
                            `Your payout of ${amount} was rejected.`,

                        type:
                            "withdrawal",

                        session

                    });


                    rejectedWithdrawal =
                        withdrawal.toObject();

                }
            );


            // ============================================================
            // AUDIT
            // ============================================================

            try {

                if (
                    audit &&
                    typeof audit ===
                        "function"
                ) {

                    await audit({

                        project:
                            projectId,

                        actor:
                            actorId,

                        action:
                            "withdrawal.reject",

                        resource:
                            "withdrawal",

                        resourceId:
                            withdrawalId,

                        metadata: {

                            amount:
                                rejectedWithdrawal.amount,

                            status:
                                "rejected"

                        }

                    });

                }

            } catch (auditError) {

                console.error(

                    "WITHDRAWAL REJECTION AUDIT ERROR:",

                    auditError.message

                );

            }


            // ============================================================
            // SUCCESS
            // ============================================================

            return {

                success:
                    true,

                withdrawal:
                    rejectedWithdrawal

            };


        } catch (error) {

            return {

                success:
                    false,

                message:
                    error.message

            };


        } finally {

            await session.endSession();

        }

    }

};
