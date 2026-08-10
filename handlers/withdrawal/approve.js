const Withdrawal = require("../../models/Withdrawal");
const Transaction = require("../../models/Transaction");
const Wallet = require("../../models/Wallet");

const audit = require("../../services/auditService");


module.exports = {

    name: "withdrawal.approve",


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
         * be approved.
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
         * The withdrawal amount must still
         * be reserved in pendingBalance.
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
         * Finalize the reserved money.
         *
         * balance:
         * already decreased when requested.
         *
         * pendingBalance:
         * decreases now.
         *
         * totalWithdrawn:
         * increases now.
         */
        wallet.pendingBalance -=
            withdrawal.amount;

        wallet.totalWithdrawn +=
            withdrawal.amount;


        await wallet.save();


        /*
         * Mark withdrawal as approved.
         */
        withdrawal.status =
            "approved";

        withdrawal.processedAt =
            new Date();

        withdrawal.processedBy =
            ctx.actorId || null;


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
             * The original request transaction
             * becomes the completed withdrawal
             * transaction.
             */
            transaction.type =
                "withdrawal";

            transaction.status =
                "completed";

            transaction.description =
                "Withdrawal approved";


            await transaction.save();

        } else {

            /*
             * Safety fallback for older withdrawals
             * that do not have a linked transaction.
             */
            await Transaction.create({

                project: ctx.projectId,

                user: withdrawal.user,

                withdrawal: withdrawal._id,

                type: "withdrawal",

                amount: withdrawal.amount,

                description:
                    "Withdrawal approved",

                status: "completed"

            });

        }


        /*
         * Audit the approval.
         */
        await audit.log({

            project: ctx.projectId,

            actor: ctx.actorId,

            user: withdrawal.user,

            action: "withdrawal.approved",

            resource: "withdrawal",

            metadata: {

                withdrawalId:
                    withdrawal._id,

                amount:
                    withdrawal.amount

            },

            req: ctx.req

        });


        return {

            success: true,

            withdrawal

        };

    }

};
