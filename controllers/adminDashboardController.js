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


        const totalWalletBalance = await Wallet.aggregate([
            {
                $match:{
                    project: projectId
                }
            },
            {
                $group:{
                    _id:null,
                    total:{
                        $sum:"$balance"
                    }
                }
            }
        ]);


        const pendingWithdrawals = await Withdrawal.countDocuments({
            project: projectId,
            status:"pending"
        });


        const recentUsers = await User.find({
            project: projectId
        })
        .select("-password")
        .sort({
            createdAt:-1
        })
        .limit(10);



        const recentTransactions = await Transaction.find({
            project: projectId
        })
        .populate(
            "user",
            "username email"
        )
        .sort({
            createdAt:-1
        })
        .limit(10);



        res.json({

            success:true,

            data:{

                totalUsers,

                activeUsers,

                totalWalletBalance:
                totalWalletBalance[0]?.total || 0,

                pendingWithdrawals,

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
