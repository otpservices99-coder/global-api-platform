const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");


const adminDashboard = async (req,res)=>{

    try{


        const project = req.project._id;



        const totalUsers = await User.countDocuments({
            project
        });



        const activeUsers = await User.countDocuments({
            project,
            status:"active"
        });



        const suspendedUsers = await User.countDocuments({
            project,
            status:"suspended"
        });



        const bannedUsers = await User.countDocuments({
            project,
            status:"banned"
        });



        const wallets = await Wallet.find({
            project
        });



        let totalBalance = 0;
        let totalEarned = 0;
        let totalWithdrawn = 0;



        wallets.forEach(wallet=>{

            totalBalance += wallet.balance;

            totalEarned += wallet.totalEarned;

            totalWithdrawn += wallet.totalWithdrawn;

        });



        const pendingWithdrawals =
        await Withdrawal.countDocuments({

            project,

            status:"pending"

        });



        const approvedWithdrawals =
        await Withdrawal.countDocuments({

            project,

            status:"approved"

        });



        const transactions =
        await Transaction.find({

            project

        })
        .sort({
            createdAt:-1
        })
        .limit(10);



        const activity =
        await AuditLog.find({

            project

        })
        .sort({
            createdAt:-1
        })
        .limit(10);



        res.json({

            success:true,

            data:{


                users:{

                    total:totalUsers,

                    active:activeUsers,

                    suspended:suspendedUsers,

                    banned:bannedUsers

                },


                wallet:{

                    balance:totalBalance,

                    earned:totalEarned,

                    withdrawn:totalWithdrawn

                },


                withdrawals:{

                    pending:pendingWithdrawals,

                    approved:approvedWithdrawals

                },


                transactions,

                activity


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
    adminDashboard
};
