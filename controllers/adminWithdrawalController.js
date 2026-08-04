const Withdrawal = require("../models/Withdrawal");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const audit = require("../services/auditService");


// GET ALL WITHDRAWALS
const getWithdrawals = async (req, res) => {

    try {

        const {
            status,
            page = 1,
            limit = 20
        } = req.query;


        const query = {
            project: req.project._id
        };


        if (status) {
            query.status = status;
        }


        const withdrawals = await Withdrawal.find(query)
            .populate(
                "user",
                "username email"
            )
            .sort({
                createdAt: -1
            })
            .skip((page - 1) * limit)
            .limit(Number(limit));


        const total = await Withdrawal.countDocuments(query);


        res.json({

            success: true,

            total,

            page: Number(page),

            limit: Number(limit),

            data: withdrawals

        });


    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





// APPROVE WITHDRAWAL
const approveWithdrawal = async (req, res) => {

    try {


        const withdrawal = await Withdrawal.findOne({

            _id: req.params.id,

            project: req.project._id

        });


        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message: "Withdrawal not found"

            });

        }



        if (withdrawal.status !== "pending") {

            return res.status(400).json({

                success: false,

                message: "Withdrawal already processed"

            });

        }



        withdrawal.status = "approved";

        await withdrawal.save();



        await audit.log({

            project: req.project._id,

            actor: req.user.id,

            action: "withdrawal.approved",

            resource: "withdrawal",

            metadata: {

                withdrawalId: withdrawal._id

            },

            req

        });



        res.json({

            success: true,

            message: "Withdrawal approved",

            data: withdrawal

        });



    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};







// REJECT WITHDRAWAL
const rejectWithdrawal = async (req, res) => {

    try {


        const withdrawal = await Withdrawal.findOne({

            _id: req.params.id,

            project: req.project._id

        });


        if (!withdrawal) {

            return res.status(404).json({

                success: false,

                message: "Withdrawal not found"

            });

        }



        if (withdrawal.status !== "pending") {

            return res.status(400).json({

                success: false,

                message: "Withdrawal already processed"

            });

        }



        withdrawal.status = "rejected";

        await withdrawal.save();



        // Refund wallet balance
        await Wallet.findOneAndUpdate(

            {
                project: req.project._id,
                user: withdrawal.user
            },

            {
                $inc: {
                    balance: withdrawal.amount
                }
            }

        );



        await Transaction.create({

            project: req.project._id,

            user: withdrawal.user,

            type: "refund",

            amount: withdrawal.amount,

            description: "Rejected withdrawal refund",

            status: "completed"

        });



        await audit.log({

            project: req.project._id,

            actor: req.user.id,

            action: "withdrawal.rejected",

            resource: "withdrawal",

            metadata: {

                withdrawalId: withdrawal._id

            },

            req

        });



        res.json({

            success: true,

            message: "Withdrawal rejected and refunded",

            data: withdrawal

        });



    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};





module.exports = {

    getWithdrawals,

    approveWithdrawal,

    rejectWithdrawal

};
