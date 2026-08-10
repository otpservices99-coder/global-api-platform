const Withdrawal = require("../models/Withdrawal");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");


const requestWithdrawal = async (req, res) => {

    try {

        const {
            amount,
            method,
            details
        } = req.body;


        /*
         * Validate amount
         */

        const value = Number(amount);


        if (!Number.isFinite(value) || value <= 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });

        }


        /*
         * Validate withdrawal method
         */

        if (
            !method ||
            typeof method !== "string"
        ) {

            return res.status(400).json({
                success: false,
                message: "Withdrawal method is required"
            });

        }


        /*
         * Validate account details
         */

        if (
            !details ||
            typeof details !== "object" ||
            Array.isArray(details)
        ) {

            return res.status(400).json({
                success: false,
                message: "Withdrawal details are required"
            });

        }


        /*
         * Find wallet
         */

        const wallet = await Wallet.findOne({

            project: req.project._id,

            user: req.user._id

        });


        if (!wallet) {

            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });

        }


        /*
         * Check available balance
         */

        if (wallet.balance < value) {

            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });

        }


        /*
         * Reserve the money.
         *
         * Available balance decreases.
         * Pending balance increases.
         */

        wallet.balance -= value;

        wallet.pendingBalance += value;

        await wallet.save();


        let withdrawal = null;

        let transaction = null;


        try {

            /*
             * Create withdrawal first.
             */

            withdrawal =
                await Withdrawal.create({

                    project: req.project._id,

                    user: req.user._id,

                    amount: value,

                    method: method.trim(),

                    account: details,

                    status: "pending"

                });


            /*
             * Make absolutely sure the withdrawal
             * was actually created before creating
             * the transaction.
             */

            if (!withdrawal || !withdrawal._id) {

                throw new Error(
                    "Withdrawal could not be created"
                );

            }


            /*
             * Create transaction with the exact
             * Withdrawal ObjectId.
             */

            transaction =
                await Transaction.create({

                    project: req.project._id,

                    user: req.user._id,

                    withdrawal: withdrawal._id,

                    type: "withdrawal_request",

                    amount: value,

                    description:
                        "Withdrawal request",

                    status: "pending"

                });


            /*
             * Verify the relationship immediately.
             */

            if (
                !transaction ||
                !transaction._id
            ) {

                throw new Error(
                    "Withdrawal transaction could not be created"
                );

            }


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
             * Return the complete result.
             */

            return res.status(201).json({

                success: true,

                message:
                    "Withdrawal request submitted",

                data: {

                    withdrawal,

                    transaction

                }

            });


        } catch (error) {

            /*
             * Roll back wallet reservation.
             */

            wallet.balance += value;

            wallet.pendingBalance -= value;

            await wallet.save();


            /*
             * If a withdrawal was created but the
             * transaction failed, remove the orphaned
             * withdrawal.
             */

            if (
                withdrawal &&
                withdrawal._id
            ) {

                try {

                    await Withdrawal.deleteOne({

                        _id: withdrawal._id

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


    } catch (error) {

        console.error(
            "Withdrawal request error:",
            error
        );


        return res.status(400).json({

            success: false,

            message: error.message

        });

    }

};



module.exports = {

    requestWithdrawal

};
