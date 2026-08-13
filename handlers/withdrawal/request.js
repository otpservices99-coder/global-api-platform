const Withdrawal = require("../../models/Withdrawal");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");

module.exports = {

    name: "withdrawal.request",

    execute: async (ctx) => {

        const projectId =
            ctx.projectId ||
            ctx.project?._id ||
            ctx.event?.project;

        const userId =
            ctx.userId ||
            ctx.data?.user ||
            ctx.event?.userId;

        const data =
            ctx.data || {};

        /*
        |--------------------------------------------------------------------------
        | Validate project
        |--------------------------------------------------------------------------
        */

        if (!projectId) {

            return {
                success: false,
                message: "Project ID is required"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Validate user
        |--------------------------------------------------------------------------
        */

        if (!userId) {

            return {
                success: false,
                message: "User ID is required"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Read request data
        |--------------------------------------------------------------------------
        */

        const {
            amount,
            method,
            details
        } = data;

        /*
        |--------------------------------------------------------------------------
        | Validate amount
        |--------------------------------------------------------------------------
        */

        const value = Number(amount);

        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            return {
                success: false,
                message: "Invalid withdrawal amount"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Validate withdrawal method
        |--------------------------------------------------------------------------
        */

        if (
            !method ||
            typeof method !== "string"
        ) {

            return {
                success: false,
                message: "Withdrawal method is required"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Validate account details
        |--------------------------------------------------------------------------
        */

        if (
            !details ||
            typeof details !== "object" ||
            Array.isArray(details)
        ) {

            return {
                success: false,
                message: "Withdrawal details are required"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Find wallet
        |--------------------------------------------------------------------------
        */

        const wallet =
            await Wallet.findOne({

                project: projectId,

                user: userId

            });

        if (!wallet) {

            return {
                success: false,
                message: "Wallet not found"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Check available balance
        |--------------------------------------------------------------------------
        */

        if (wallet.balance < value) {

            return {
                success: false,
                message: "Insufficient balance"
            };

        }

        /*
        |--------------------------------------------------------------------------
        | Reserve balance
        |--------------------------------------------------------------------------
        |
        | Available balance decreases.
        |
        | Pending balance increases.
        |
        */

        wallet.balance -= value;

        wallet.pendingBalance += value;

        await wallet.save();

        let withdrawal = null;

        let transaction = null;

        try {

            /*
            |--------------------------------------------------------------------------
            | Create withdrawal
            |--------------------------------------------------------------------------
            */

            withdrawal =
                await Withdrawal.create({

                    project: projectId,

                    user: userId,

                    amount: value,

                    method:
                        method.trim(),

                    account: details,

                    status: "pending"

                });

            if (
                !withdrawal ||
                !withdrawal._id
            ) {

                throw new Error(
                    "Withdrawal could not be created"
                );

            }

            /*
            |--------------------------------------------------------------------------
            | Create withdrawal transaction
            |--------------------------------------------------------------------------
            */

            transaction =
                await Transaction.create({

                    project: projectId,

                    user: userId,

                    withdrawal:
                        withdrawal._id,

                    type:
                        "withdrawal_request",

                    amount: value,

                    description:
                        "Withdrawal request",

                    status:
                        "pending"

                });

            if (
                !transaction ||
                !transaction._id
            ) {

                throw new Error(
                    "Withdrawal transaction could not be created"
                );

            }

            /*
            |--------------------------------------------------------------------------
            | Verify relationship
            |--------------------------------------------------------------------------
            */

            if (
                !transaction.withdrawal ||
                transaction.withdrawal.toString() !==
                withdrawal._id.toString()
            ) {

                throw new Error(
                    "Withdrawal transaction relationship could not be established"
                );

            }

            /*
            |--------------------------------------------------------------------------
            | Success
            |--------------------------------------------------------------------------
            */

            return {

                success: true,

                message:
                    "Withdrawal request submitted",

                data: {

                    withdrawal,

                    transaction

                }

            };

        } catch (error) {

            /*
            |--------------------------------------------------------------------------
            | Roll back wallet reservation
            |--------------------------------------------------------------------------
            */

            wallet.balance += value;

            wallet.pendingBalance -= value;

            await wallet.save();

            /*
            |--------------------------------------------------------------------------
            | Remove orphaned withdrawal
            |--------------------------------------------------------------------------
            */

            if (
                withdrawal &&
                withdrawal._id
            ) {

                try {

                    await Withdrawal.deleteOne({

                        _id:
                            withdrawal._id

                    });

                } catch (cleanupError) {

                    console.error(
                        "Withdrawal cleanup error:",
                        cleanupError
                    );

                }

            }

            throw error;

        }

    }

};
