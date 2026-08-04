const platform = require("../services/platformService");
const Transaction = require("../models/Transaction");


const getWallet = async (req, res) => {

    try {

        const wallet = await platform.getWallet(
            req.project._id,
            req.user._id
        );


        res.json({

            success: true,

            data: wallet

        });


    } catch (err) {

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};





const creditWallet = async (req, res) => {

    try {

        const {
            amount,
            description
        } = req.body;



        const wallet = await platform.addBalance(

            req.project._id,

            req.user._id,

            Number(amount),

            description || "Wallet Credit"

        );



        res.json({

            success:true,

            message:"Wallet credited",

            data:wallet

        });



    } catch(err) {


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};






const debitWallet = async (req,res)=>{

    try{


        const {
            amount,
            description
        } = req.body;



        const wallet = await platform.removeBalance(

            req.project._id,

            req.user._id,

            Number(amount),

            description || "Wallet Debit"

        );



        res.json({

            success:true,

            message:"Wallet debited",

            data:wallet

        });



    }catch(err){


        res.status(400).json({

            success:false,

            message:err.message

        });

    }

};







const getTransactions = async(req,res)=>{

    try{


        const transactions = await Transaction.find({

            project:req.project._id,

            user:req.user._id

        })

        .sort({

            createdAt:-1

        });



        res.json({

            success:true,

            total:transactions.length,

            data:transactions

        });



    }catch(err){


        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};







module.exports = {

    getWallet,

    creditWallet,

    debitWallet,

    getTransactions

};
