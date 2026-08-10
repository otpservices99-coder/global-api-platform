const Transaction = require("../models/Transaction");



const getTransactions = async (req, res) => {

    try {

        const {
            type,
            user,
            status,
            page = 1,
            limit = 20
        } = req.query;


        const currentPage =
            Math.max(Number(page) || 1, 1);


        const currentLimit =
            Math.min(
                Math.max(Number(limit) || 20, 1),
                100
            );


        const filter = {

            project: req.project._id

        };


        /*
         * Filter by transaction type
         */

        if (type) {

            filter.type = type;

        }


        /*
         * Filter by user
         */

        if (user) {

            filter.user = user;

        }


        /*
         * Filter by transaction status
         */

        if (status) {

            filter.status = status;

        }


        const skip =
            (currentPage - 1) * currentLimit;


        /*
         * Get transactions
         *
         * Populate both the user and the
         * related withdrawal.
         */

        const transactions =
            await Transaction.find(filter)

                .populate(
                    "user",
                    "username email"
                )

                .populate(
                    "withdrawal",
                    "project user amount method account status processedAt processedBy rejectionReason createdAt updatedAt"
                )

                .sort({
                    createdAt: -1
                })

                .skip(skip)

                .limit(currentLimit);


        /*
         * Total transaction count
         */

        const total =
            await Transaction.countDocuments(
                filter
            );


        const pages =
            Math.ceil(
                total / currentLimit
            );


        return res.json({

            success: true,

            total,

            page: currentPage,

            limit: currentLimit,

            pages,

            data: transactions

        });


    } catch (error) {

        console.error(
            "Admin transaction error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



module.exports = {

    getTransactions

};
