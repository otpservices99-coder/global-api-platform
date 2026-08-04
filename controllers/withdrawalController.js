const Withdrawal = require("../models/Withdrawal");
const platform = require("../services/platformService");

const requestWithdrawal = async (req, res) => {

    try {

        const { amount, method, details } = req.body;

        await platform.removeBalance(
            req.project._id,
            req.user._id,
            Number(amount),
            "Withdrawal Request"
        );

        const withdrawal = await Withdrawal.create({

            project: req.project._id,

            user: req.user._id,

            amount: Number(amount),

            method,

            account: details,

            status: "pending"

        });

        res.json({

            success: true,

            message: "Withdrawal request submitted",

            data: withdrawal

        });

    } catch (err) {

        res.status(400).json({

            success: false,

            message: err.message

        });

    }

};

module.exports = {

    requestWithdrawal

};
