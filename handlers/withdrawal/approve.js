const mongoose = require("mongoose");

const Withdrawal = require("../../models/Withdrawal");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");

const audit = require("../../services/auditService");


/*
 * ============================================================
 * WITHDRAWAL APPROVAL HANDLER
 * ============================================================
 *
 * Global / project-aware action handler.
 *
 * This handler does NOT contain:
 * - hard-coded project IDs
 * - hard-coded user IDs
 * - hard-coded wallet IDs
 * - hard-coded withdrawal amounts
 * - Earnify-specific logic
 *
 * Everything is resolved dynamically from the action context
 * and the withdrawal document.
 *
 * Flow:
 *
 *   Admin route
 *       ↓
 *   Action Engine
 *       ↓
 *   withdrawal.approve
 *       ↓
 *   MongoDB transaction
 *       ├── update wallet
 *       ├── update withdrawal
 *       └── update/create transaction
 *       ↓
 *   audit
 *
 * ============================================================
 */

module.exports = {

    name: "withdrawal.approve",


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
         * Start MongoDB transaction
         * ----------------------------------------------------
         */

        const session =
            await mongoose.startSession();


        try {

            let approvedWithdrawal = null;


            await session.withTransaction(
                async () => {

                    /*
                     * ------------------------------------------------
                     * Find the withdrawal.
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
                     * Only pending withdrawals can be approved.
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
                     * Find the wallet belonging to the same
                     * project AND the withdrawal owner.
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
                     * The requested amount must still be reserved
                     * in pendingBalance.
                     * ------------------------------------------------
                     */

                    if (
                        Number(wallet.pendingBalance) <
                        Number(withdrawal.amount)
                    ) {

                        throw new Error(
                            "Insufficient pending balance"
                        );

                    }


                    /*
                     * ------------------------------------------------
                     * Finalize wallet reservation.
                     *
                     * balance:
                     * already decreased during withdrawal request.
                     *
                     * pendingBalance:
                     * released from reservation.
                     *
                     * totalWithdrawn:
                     * permanently increases.
                     * ------------------------------------------------
                     */

                    wallet.pendingBalance =
                        Number(wallet.pendingBalance) -
                        Number(withdrawal.amount);


                    wallet.totalWithdrawn =
                        Number(wallet.totalWithdrawn) +
                        Number(withdrawal.amount);


                    await wallet.save({
                        session
                    });


                    /*
                     * ------------------------------------------------
                     * Mark withdrawal as approved.
                     *
                     * These fields are explicitly written here so
                     * an approved withdrawal can NEVER intentionally
                     * remain with:
                     *
                     * processedAt: null
                     * processedBy: null
                     * ------------------------------------------------
                     */

                    withdrawal.status =
                        "approved";


                    withdrawal.processedAt =
                        new Date();


                    withdrawal.processedBy =
                        actorId;


                    await withdrawal.save({
                        session
                    });


                    /*
                     * ------------------------------------------------
                     * Find the original withdrawal request
                     * transaction.
                     *
                     * Project + user + withdrawal relationship are
                     * all checked.
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
                         * Convert the original request transaction
                         * into the completed withdrawal transaction.
                         */

                        transaction.type =
                            "withdrawal";


                        transaction.status =
                            "completed";


                        transaction.description =
                            "Withdrawal approved";


                        await transaction.save({
                            session
                        });

                    } else {

                        /*
                         * ------------------------------------------------
                         * Compatibility fallback.
                         *
                         * Older withdrawals may not have a linked
                         * withdrawal_request transaction.
                         * ------------------------------------------------
                         */

                        await Transaction.create(
                            [
                                {

                                    project: projectId,

                                    user: withdrawal.user,

                                    withdrawal:
                                        withdrawal._id,

                                    type:
                                        "withdrawal",

                                    amount:
                                        withdrawal.amount,

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


                    /*
                     * Keep a reference to the transactionally
                     * approved withdrawal for the return value.
                     */

                    approvedWithdrawal =
                        withdrawal;

                }
            );


            /*
             * ----------------------------------------------------
             * Audit AFTER successful transaction.
             *
             * If the financial operation failed, we do not write
             * a successful approval audit entry.
             * ----------------------------------------------------
             */

            await audit.log({

                project: projectId,

                actor: actorId,

                user: approvedWithdrawal.user,

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


            /*
             * ----------------------------------------------------
             * Return standardized action result.
             * ----------------------------------------------------
             */

            return {

                success: true,

                withdrawal:
                    approvedWithdrawal

            };


        } finally {

            /*
             * Always close the MongoDB session.
             */

            await session.endSession();

        }

    }

};
