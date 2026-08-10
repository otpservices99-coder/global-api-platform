const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");


const getAdminDashboard = async (req,res)=>{

    try{

        const projectId = req.project._id;


        const totalUsers = await User.countDocuments({
            project: projectId
        });


        const activeUsers = await User.countDocuments({
            project: projectId,
            status:"active"
        });


        const suspendedUsers = await User.countDocuments({
            project: projectId,
            status:"suspended"
        });


        const walletStats = await Wallet.aggregate([

            {
                $match:{
                    project: projectId
                }
            },

            {
                $group:{
                    _id:null,

                    totalBalance:{
                        $sum:"$balance"
                    },

                    totalPending:{
                        $sum:"$pendingBalance"
                    },

                    totalEarned:{
                        $sum:"$totalEarned"
                    },

                    totalWithdrawn:{
                        $sum:"$totalWithdrawn"
                    }

                }
            }

        ]);



        const withdrawalStats = await Withdrawal.aggregate([

            {
                $match:{
                    project: projectId
                }
            },

            {
                $group:{

                    _id:"$status",

                    count:{
                        $sum:1
                    },

                    amount:{
                        $sum:"$amount"
                    }

                }

            }

        ]);



        const totalTransactions =
        await Transaction.countDocuments({
            project:projectId
        });



        const recentUsers = await User.find({

            project:projectId

        })
        .select("-password")
        .sort({
            createdAt:-1
        })
        .limit(10);



        const recentTransactions =
        await Transaction.find({

            project:projectId

        })
        .populate(
            "user",
            "username email"
        )
        .sort({
            createdAt:-1
        })
        .limit(10);



        const withdrawals = {

            pending:{
                count:0,
                amount:0
            },

            approved:{
                count:0,
                amount:0
            },

            rejected:{
                count:0,
                amount:0
            }

        };



        withdrawalStats.forEach(item=>{

            if(withdrawals[item._id]){

                withdrawals[item._id]={
                    count:item.count,
                    amount:item.amount
                };

            }

        });



        const wallet = walletStats[0] || {

            totalBalance:0,
            totalPending:0,
            totalEarned:0,
            totalWithdrawn:0

        };



        res.json({

            success:true,

            data:{

                users:{

                    total:totalUsers,

                    active:activeUsers,

                    suspended:suspendedUsers

                },


                wallet:{

                    balance:wallet.totalBalance,

                    pendingBalance:
                    wallet.totalPending,

                    totalEarned:
                    wallet.totalEarned,

                    totalWithdrawn:
                    wallet.totalWithdrawn

                },


                withdrawals,


                totalTransactions,


                recentUsers,


                recentTransactions

            }

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



module.exports={
    getAdminDashboard
};
