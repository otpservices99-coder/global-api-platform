const Withdrawal = require("../../models/Withdrawal");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");

const audit = require("../../services/auditService");


module.exports = {

    name: "withdrawal.reject",


    execute: async (ctx) => {

        const withdrawalId =
            ctx.data?.withdrawalId;


        if (!withdrawalId) {

            throw new Error(
                "Withdrawal ID is required"
            );

        }


        /*
         * Find the withdrawal inside the
         * current project only.
         */
        const withdrawal =
            await Withdrawal.findOne({

                _id: withdrawalId,

                project: ctx.projectId

            });


        if (!withdrawal) {

            throw new Error(
                "Withdrawal not found"
            );

        }


        /*
         * Only pending withdrawals can
         * be rejected.
         */
        if (
            withdrawal.status !== "pending"
        ) {

            throw new Error(
                "Withdrawal already processed"
            );

        }


        /*
         * Find the user's wallet.
         */
        const wallet =
            await Wallet.findOne({

                project: ctx.projectId,

                user: withdrawal.user

            });


        if (!wallet) {

            throw new Error(
                "Wallet not found"
            );

        }


        /*
         * Verify that the money is actually
         * reserved.
         */
        if (
            wallet.pendingBalance <
            withdrawal.amount
        ) {

            throw new Error(
                "Insufficient pending balance"
            );

        }


        /*
         * Return the reserved money.
         *
         * pendingBalance decreases.
         *
         * balance increases.
         *
         * totalWithdrawn remains unchanged.
         */
        wallet.pendingBalance -=
            withdrawal.amount;

        wallet.balance +=
            withdrawal.amount;


        await wallet.save();


        const rejectionReason =
            ctx.data?.rejectionReason ||
            "Withdrawal rejected";


        /*
         * Mark withdrawal as rejected.
         */
        withdrawal.status =
            "rejected";

        withdrawal.processedAt =
            new Date();

        withdrawal.processedBy =
            ctx.actorId || null;

        withdrawal.rejectionReason =
            rejectionReason;


        await withdrawal.save();


        /*
         * Find the original withdrawal
         * request transaction.
         */
        const transaction =
            await Transaction.findOne({

                project: ctx.projectId,

                user: withdrawal.user,

                withdrawal: withdrawal._id,

                type: "withdrawal_request"

            });


        if (transaction) {

            /*
             * Keep the original request transaction
             * as the transaction record, but mark it
             * rejected.
             */
            transaction.status =
                "rejected";

            transaction.description =
                "Withdrawal rejected";


            await transaction.save();

        } else {

            /*
             * Safety fallback for older withdrawals
             * without a linked transaction.
             */
            await Transaction.create({

                project: ctx.projectId,

                user: withdrawal.user,

                withdrawal: withdrawal._id,

                type: "withdrawal_request",

                amount: withdrawal.amount,

                description:
                    "Withdrawal rejected",

                status: "rejected"

            });

        }


        /*
         * Create a separate refund transaction.
         *
         * This provides a clear financial audit trail
         * showing that the rejected withdrawal amount
         * was returned to the user's wallet.
         */
        await Transaction.create({

            project: ctx.projectId,

            user: withdrawal.user,

            withdrawal: withdrawal._id,

            type: "refund",

            amount: withdrawal.amount,

            description:
                "Rejected withdrawal refund",

            status: "completed"

        });


        /*
         * Audit the rejection.
         */
        await audit.log({

            project: ctx.projectId,

            actor: ctx.actorId,

            user: withdrawal.user,

            action: "withdrawal.rejected",

            resource: "withdrawal",

            metadata: {

                withdrawalId:
                    withdrawal._id,

                amount:
                    withdrawal.amount,

                reason:
                    rejectionReason

            },

            req: ctx.req

        });


        return {

            success: true,

            withdrawal

        };

    }

};
