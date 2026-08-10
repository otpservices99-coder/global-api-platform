const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

const platform = require("../services/platformService");



/*
 * Get user wallet
 *
 * GET /api/v1/admin/wallet/:userId
 */
const getUserWallet = async (req, res) => {

    try {

        const wallet = await Wallet.findOne({

            project: req.project._id,

            user: req.params.userId

        }).lean();


        if (!wallet) {

            return res.status(404).json({

                success: false,

                message: "Wallet not found"

            });

        }


        /*
         * Get recent withdrawal information.
         *
         * This allows the admin panel to see
         * the user's wallet and recent withdrawals
         * together.
         */

        const withdrawals = await Withdrawal.find({

            project: req.project._id,

            user: req.params.userId

        })
        .sort({
            createdAt: -1
        })
        .limit(20)
        .lean();


        return res.json({

            success: true,

            data: {

                wallet,

                withdrawals

            }

        });

    } catch (error) {

        console.error(
            "Admin get wallet error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





/*
 * Credit user wallet
 *
 * POST /api/v1/admin/wallet/:userId/credit
 */
const creditUserWallet = async (req, res) => {

    try {

        const amount = Number(
            req.body.amount
        );


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Amount must be greater than zero"

            });

        }


        const wallet =
            await platform.addBalance(

                req.project._id,

                req.params.userId,

                amount,

                req.body.description ||
                "Admin wallet credit"

            );


        return res.json({

            success: true,

            message: "Wallet credited",

            data: wallet

        });

    } catch (error) {

        console.error(
            "Admin wallet credit error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





/*
 * Debit user wallet
 *
 * POST /api/v1/admin/wallet/:userId/debit
 */
const debitUserWallet = async (req, res) => {

    try {

        const amount = Number(
            req.body.amount
        );


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message: "Amount must be greater than zero"

            });

        }


        const wallet =
            await platform.removeBalance(

                req.project._id,

                req.params.userId,

                amount,

                req.body.description ||
                "Admin wallet debit"

            );


        return res.json({

            success: true,

            message: "Wallet debited",

            data: wallet

        });

    } catch (error) {

        console.error(
            "Admin wallet debit error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





/*
 * Get user transactions
 *
 * GET /api/v1/admin/wallet/:userId/transactions
 */
const getUserTransactions = async (req, res) => {

    try {

        const transactions =
            await Transaction.find({

                project: req.project._id,

                user: req.params.userId

            })
            .populate("withdrawal")
            .sort({
                createdAt: -1
            })
            .lean();


        return res.json({

            success: true,

            data: transactions

        });

    } catch (error) {

        console.error(
            "Admin get transactions error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





module.exports = {

    getUserWallet,

    creditUserWallet,

    debitUserWallet,

    getUserTransactions

};
