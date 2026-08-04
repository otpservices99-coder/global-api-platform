const User = require("../models/User");
const platform = require("../services/platformService");
const audit = require("../services/auditService");


// Get all users
const getUsers = async (req,res)=>{

    try{

        const users = await User.find({
            project:req.project._id
        }).select("-password");


        res.json({
            success:true,
            total:users.length,
            data:users
        });


    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};



// Get user by ID
const getUserById = async(req,res)=>{

    try{

        const user = await User.findOne({

            _id:req.params.id,

            project:req.project._id

        }).select("-password");


        if(!user){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }


        res.json({
            success:true,
            data:user
        });


    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};



// Credit user wallet
const creditUser = async(req,res)=>{

    try{

        const {amount,description}=req.body;


        const user=await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });


        if(!user){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }


        await platform.addBalance(

            req.project._id,

            user._id,

            Number(amount),

            description || "Admin Credit"

        );



        await platform.notify(

            req.project._id,

            user._id,

            "Wallet Credited",

            `Your wallet has been credited with ${amount}`

        );



        await audit.log({

            project:req.project._id,

            actor:req.user._id,

            user:user._id,

            action:"wallet.credit",

            resource:"wallet",

            metadata:{
                amount,
                description
            },

            req

        });



        res.json({

            success:true,

            message:"Wallet credited successfully"

        });



    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};



// Debit user wallet
const debitUser = async(req,res)=>{

    try{

        const {amount,description}=req.body;


        const user=await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }



        await platform.removeBalance(

            req.project._id,

            user._id,

            Number(amount),

            description || "Admin Debit"

        );



        await platform.notify(

            req.project._id,

            user._id,

            "Wallet Debited",

            `Your wallet has been debited by ${amount}`

        );



        await audit.log({

            project:req.project._id,

            actor:req.user._id,

            user:user._id,

            action:"wallet.debit",

            resource:"wallet",

            metadata:{
                amount,
                description
            },

            req

        });



        res.json({

            success:true,

            message:"Wallet debited successfully"

        });



    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};



// Update user status
const updateUserStatus = async(req,res)=>{

    try{

        const {status}=req.body;


        const allowed=[
            "active",
            "suspended",
            "banned"
        ];


        if(!allowed.includes(status)){

            return res.status(400).json({
                success:false,
                message:"Invalid status"
            });

        }



        const user=await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }



        user.status=status;

        await user.save();



        await audit.log({

            project:req.project._id,

            actor:req.user._id,

            user:user._id,

            action:"user.status_update",

            resource:"user",

            metadata:{
                status
            },

            req

        });



        res.json({

            success:true,

            message:"User status updated",

            data:{
                status:user.status
            }

        });



    }catch(error){

        res.status(500).json({
            success:false,
            message:error.message
        });

    }

};



// Update user role
const updateUserRole = async(req,res)=>{

    try{

        const {role}=req.body;


        const allowed=[

            "superadmin",
            "admin",
            "moderator",
            "support",
            "user"

        ];


        if(!allowed.includes(role)){

            return res.status(400).json({
                success:false,
                message:"Invalid role"
            });

        }



        const user=await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });

        }



        user.role=role;

        await user.save();



        await audit.log({

            project:req.project._id,

            actor:req.user._id,

            user:user._id,

            action:"user.role_update",

            resource:"user",

            metadata:{
                role
            },

            req

        });



        res.json({

            success:true,

            message:"User role updated",

            data:{
                role:user.role
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

    getUsers,

    getUserById,

    creditUser,

    debitUser,

    updateUserStatus,

    updateUserRole

};
