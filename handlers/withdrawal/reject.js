const mongoose = require("mongoose");

const Withdrawal = require("../../models/Withdrawal");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");

const audit = require("../../services/auditService");


/*
 * ============================================================
 * WITHDRAWAL REJECTION HANDLER
 * ============================================================
 *
 * Global / project-aware action handler.
 *
 * No hard-coded:
 * - project IDs
 * - user IDs
 * - wallet IDs
 * - withdrawal amounts
 * - currency
 * - project-specific business rules
 *
 * Everything is resolved dynamically from:
 * - Action Engine context
 * - Withdrawal document
 * - Wallet document
 * - Transaction documents
 *
 * Financial operation:
 *
 *   pending withdrawal
 *          ↓
 *   MongoDB transaction
 *          ├── refund wallet balance
 *          ├── release pendingBalance
 *          ├── mark withdrawal rejected
 *          ├── mark request transaction rejected
 *          └── create refund transaction
 *          ↓
 *   successful transaction
 *          ↓
 *   audit
 *
 * ============================================================
 */

module.exports = {

    name: "withdrawal.reject",


    execute: async (ctx) => {

        const withdrawalId =
            ctx?.data?.withdrawalId;

        const projectId =
            ctx?.projectId;

        const actorId =
            ctx?.actorId || null;


        /*
         * ----------------------------------------------------
         * Validate action context
         * ----------------------------------------------------
         */

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


        /*
         * ----------------------------------------------------
         * Rejection reason
         * ----------------------------------------------------
         */

        const rejectionReason =
            ctx?.data?.rejectionReason ||
            "Withdrawal rejected";


        /*
         * ----------------------------------------------------
         * Start MongoDB transaction.
         * ----------------------------------------------------
         */

        const session =
            await mongoose.startSession();


        try {

            let rejectedWithdrawal = null;


            await session.withTransaction(
                async () => {

                    /*
                     * ------------------------------------------------
                     * Find withdrawal.
                     *
                     * Project ownership is ALWAYS enforced.
                     * ------------------------------------------------
                     */

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


                    /*
                     * ------------------------------------------------
                     * Only pending withdrawals may be rejected.
                     *
                     * This also prevents a second rejection from
                     * refunding the user again.
                     * ------------------------------------------------
                     */

                    if (
                        withdrawal.status !== "pending"
                    ) {

                        throw new Error(
                            "Withdrawal already processed"
                        );

                    }


                    /*
                     * ------------------------------------------------
                     * Validate withdrawal amount.
                     * ------------------------------------------------
                     */

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


                    /*
                     * ------------------------------------------------
                     * Find wallet belonging to the same project
                     * and withdrawal owner.
                     * ------------------------------------------------
                     */

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


                    /*
                     * ------------------------------------------------
                     * The withdrawal amount must still be reserved
                     * in pendingBalance.
                     *
                     * This prevents refunding money that is no
                     * longer reserved.
                     * ------------------------------------------------
                     */

                    const pendingBalance =
                        Number(wallet.pendingBalance);


                    if (
                        !Number.isFinite(pendingBalance) ||
                        pendingBalance < amount
                    ) {

                        throw new Error(
                            "Insufficient pending balance"
                        );

                    }


                    /*
                     * ------------------------------------------------
                     * Refund the reserved money.
                     *
                     * balance:
                     * increases because the withdrawal was rejected.
                     *
                     * pendingBalance:
                     * decreases because the reservation is released.
                     *
                     * totalWithdrawn:
                     * remains unchanged.
                     * ------------------------------------------------
                     */

                    wallet.balance =
                        Number(wallet.balance) +
                        amount;


                    wallet.pendingBalance =
                        pendingBalance -
                        amount;


                    await wallet.save({
                        session
                    });


                    /*
                     * ------------------------------------------------
                     * Mark withdrawal as rejected.
                     * ------------------------------------------------
                     */

                    withdrawal.status =
                        "rejected";


                    withdrawal.processedAt =
                        new Date();


                    withdrawal.processedBy =
                        actorId;


                    withdrawal.rejectionReason =
                        rejectionReason;


                    await withdrawal.save({
                        session
                    });


                    /*
                     * ------------------------------------------------
                     * Find the original withdrawal request transaction.
                     *
                     * The relationship is scoped by:
                     * - project
                     * - user
                     * - withdrawal
                     * - transaction type
                     * ------------------------------------------------
                     */

                    const transaction =
                        await Transaction.findOne({

                            project: projectId,

                            user: withdrawal.user,

                            withdrawal: withdrawal._id,

                            type: "withdrawal_request"

                        }).session(session);


                    if (transaction) {

                        /*
                         * Keep the original request transaction but
                         * mark it rejected.
                         */

                        transaction.status =
                            "rejected";


                        transaction.description =
                            "Withdrawal rejected";


                        await transaction.save({
                            session
                        });

                    } else {

                        /*
                         * ------------------------------------------------
                         * Compatibility fallback for legacy withdrawals
                         * without a linked withdrawal_request transaction.
                         * ------------------------------------------------
                         */

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
                                        "withdrawal_request",

                                    amount:
                                        amount,

                                    description:
                                        "Withdrawal rejected",

                                    status:
                                        "rejected"

                                }
                            ],
                            {
                                session
                            }
                        );

                    }


                    /*
                     * ------------------------------------------------
                     * Create the refund transaction.
                     *
                     * This is inside the SAME MongoDB transaction as
                     * the wallet and withdrawal updates.
                     *
                     * Therefore:
                     *
                     * wallet refund succeeds
                     * + withdrawal rejection succeeds
                     * + refund transaction succeeds
                     *
                     * OR
                     *
                     * none of them are committed.
                     * ------------------------------------------------
                     */

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
                                    "refund",

                                amount:
                                    amount,

                                description:
                                    "Rejected withdrawal refund",

                                status:
                                    "completed"

                            }
                        ],
                        {
                            session
                        }
                    );


                    /*
                     * Keep the transactionally rejected withdrawal
                     * for the final return value.
                     */

                    rejectedWithdrawal =
                        withdrawal;

                }
            );


            /*
             * ----------------------------------------------------
             * Audit AFTER the financial transaction succeeds.
             *
             * The audit failure must not roll back an already
             * completed financial operation.
             * ----------------------------------------------------
             */

            await audit.log({

                project:
                    projectId,

                actor:
                    actorId,

                user:
                    rejectedWithdrawal.user,

                action:
                    "withdrawal.rejected",

                resource:
                    "withdrawal",

                metadata: {

                    withdrawalId:
                        rejectedWithdrawal._id,

                    amount:
                        rejectedWithdrawal.amount,

                    reason:
                        rejectedWithdrawal.rejectionReason

                },

                req:
                    ctx?.req

            });


            /*
             * ----------------------------------------------------
             * Return standardized Action Engine result.
             * ----------------------------------------------------
             */

            return {

                success: true,

                withdrawal:
                    rejectedWithdrawal

            };

        } finally {

            /*
             * Always close the MongoDB session.
             */

            await session.endSession();

        }

    }

};
