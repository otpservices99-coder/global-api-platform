const platform = require("../services/platformService");
const User = require("../models/User");
const Transaction = require("../models/Transaction");


const creditUserWallet = async (req,res)=>{

    try{

        const { amount, description } = req.body;


        const user = await User.findOne({

            _id:req.params.userId,

            project:req.project._id

        });


        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }


        const wallet = await platform.addBalance(

            req.project._id,

            user._id,

            Number(amount),

            description || "Admin Wallet Credit"

        );


        res.json({

            success:true,

            message:"User wallet credited",

            data:wallet

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




const debitUserWallet = async (req,res)=>{

    try{

        const { amount, description } = req.body;


        const user = await User.findOne({

            _id:req.params.userId,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }



        const wallet = await platform.removeBalance(

            req.project._id,

            user._id,

            Number(amount),

            description || "Admin Wallet Debit"

        );



        res.json({

            success:true,

            message:"User wallet debited",

            data:wallet

        });



    }catch(error){

        res.status(400).json({

            success:false,

            message:error.message

        });

    }

};




const getUserTransactions = async(req,res)=>{

    try{


        const transactions = await Transaction.find({

            project:req.project._id,

            user:req.params.userId

        })

        .sort({

            createdAt:-1

        });



        res.json({

            success:true,

            data:transactions

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




module.exports={

    creditUserWallet,

    debitUserWallet,

    getUserTransactions

};
