const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

const getStats = async (req, res) => {

    try {

        const project = req.project._id;

        const [
            users,
            wallets,
            transactions,
            withdrawals
        ] = await Promise.all([

            User.countDocuments({ project }),

            Wallet.countDocuments({ project }),

            Transaction.countDocuments({ project }),

            Withdrawal.countDocuments({ project })

        ]);

        const walletTotals = await Wallet.aggregate([
            {
                $match: {
                    project
                }
            },
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: "$balance" },
                    totalEarned: { $sum: "$totalEarned" },
                    totalWithdrawn: { $sum: "$totalWithdrawn" }
                }
            }
        ]);

        res.json({

            success: true,

            data: {

                users,

                wallets,

                transactions,

                withdrawals,

                totalBalance: walletTotals[0]?.totalBalance || 0,

                totalEarned: walletTotals[0]?.totalEarned || 0,

                totalWithdrawn: walletTotals[0]?.totalWithdrawn || 0

            }

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {
    getStats
};
