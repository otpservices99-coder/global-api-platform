const Withdrawal = require("../models/Withdrawal");

const {
    processAction
} = require("../services/actionEngine");


// ============================================================
// GET ALL WITHDRAWALS
// ============================================================

const getWithdrawals = async (req, res) => {

    try {

        const {
            status,
            page = 1,
            limit = 20
        } = req.query;


        const pageNumber = Math.max(
            Number(page) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );


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

            .skip(
                (pageNumber - 1) * limitNumber
            )

            .limit(limitNumber);


        const total =
            await Withdrawal.countDocuments(query);


        return res.json({

            success: true,

            total,

            page: pageNumber,

            limit: limitNumber,

            data: withdrawals

        });


    } catch (error) {

        console.error(
            "Get withdrawals error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ============================================================
// APPROVE WITHDRAWAL
// ============================================================

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


        const result = await processAction({

            projectId: req.project._id,

            action: "withdrawal.approve",

            user: {
                _id: withdrawal.user
            },

            actorId: req.user._id,

            data: {

                withdrawalId: withdrawal._id

            },

            req

        });


        if (!result?.success) {

            return res.status(400).json({

                success: false,

                message:
                    result?.message ||
                    "Failed to approve withdrawal"

            });

        }


        const updatedWithdrawal =
            await Withdrawal.findOne({

                _id: withdrawal._id,

                project: req.project._id

            });


        return res.json({

            success: true,

            message: "Withdrawal approved",

            data: updatedWithdrawal

        });


    } catch (error) {

        console.error(
            "Approve withdrawal error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



// ============================================================
// REJECT WITHDRAWAL
// ============================================================

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


        const rejectionReason =
            req.body?.reason ||
            req.body?.rejectionReason ||
            "Withdrawal rejected";


        const result = await processAction({

            projectId: req.project._id,

            action: "withdrawal.reject",

            user: {
                _id: withdrawal.user
            },

            actorId: req.user._id,

            data: {

                withdrawalId: withdrawal._id,

                rejectionReason

            },

            req

        });


        if (!result?.success) {

            return res.status(400).json({

                success: false,

                message:
                    result?.message ||
                    "Failed to reject withdrawal"

            });

        }


        const updatedWithdrawal =
            await Withdrawal.findOne({

                _id: withdrawal._id,

                project: req.project._id

            });


        return res.json({

            success: true,

            message: "Withdrawal rejected and refunded",

            data: updatedWithdrawal

        });


    } catch (error) {

        console.error(
            "Reject withdrawal error:",
            error
        );


        return res.status(500).json({

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
