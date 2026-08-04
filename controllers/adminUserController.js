const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const audit = require("../services/auditService");



const getUsers = async (req,res)=>{

    try{

        const {
            search,
            status,
            role,
            page = 1,
            limit = 20
        } = req.query;



        const query = {
            project:req.project._id
        };



        if(status){

            query.status = status;

        }



        if(role){

            query.role = role;

        }



        if(search){

            query.$or = [

                {
                    username:{
                        $regex:search,
                        $options:"i"
                    }
                },

                {
                    email:{
                        $regex:search,
                        $options:"i"
                    }
                }

            ];

        }



        const users = await User.find(query)

        .select("-password")

        .skip((page - 1) * limit)

        .limit(Number(limit))

        .sort({
            createdAt:-1
        });



        const total = await User.countDocuments(query);



        res.json({

            success:true,

            total,

            page:Number(page),

            limit:Number(limit),

            data:users

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};





const getUserDetails = async(req,res)=>{

    try{


        const user = await User.findOne({

            _id:req.params.id,

            project:req.project._id

        })

        .select("-password");



        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }



        const wallet = await Wallet.findOne({

            project:req.project._id,

            user:user._id

        });



        const transactions = await Transaction.find({

            project:req.project._id,

            user:user._id

        })

        .sort({

            createdAt:-1

        })

        .limit(20);



        res.json({

            success:true,

            data:{

                user,

                wallet,

                transactions

            }

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};





const updateStatus = async(req,res)=>{

    try{


        const {status}=req.body;



        const user = await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }



        const oldStatus=user.status;



        user.status=status;


        await user.save();



        await audit.log({

            project:req.project._id,

            actor:req.user.id,

            user:user._id,

            action:"user.status_update",

            resource:"user",

            metadata:{

                from:oldStatus,

                to:status

            },

            req

        });



        res.json({

            success:true,

            message:"User status updated",

            data:{

                status

            }

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};





const updateRole = async(req,res)=>{

    try{


        const {role}=req.body;



        const user = await User.findOne({

            _id:req.params.id,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }



        const oldRole=user.role;



        user.role=role;



        await user.save();



        await audit.log({

            project:req.project._id,

            actor:req.user.id,

            user:user._id,

            action:"user.role_update",

            resource:"user",

            metadata:{

                from:oldRole,

                to:role

            },

            req

        });



        res.json({

            success:true,

            message:"User role updated",

            data:{

                role

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

    getUserDetails,

    updateStatus,

    updateRole

};
