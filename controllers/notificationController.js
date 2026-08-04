const Notification = require("../models/Notification");
const User = require("../models/User");



const sendToUser = async (req,res)=>{

    try{


        const {
            userId,
            title,
            message,
            type
        } = req.body;



        const user = await User.findOne({

            _id:userId,

            project:req.project._id

        });



        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }



        const notification = await Notification.create({

            project:req.project._id,

            user:user._id,

            audience:"user",

            title,

            message,

            type:type || "info"

        });



        res.json({

            success:true,

            data:notification

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







const broadcast = async(req,res)=>{

    try{


        const {
            title,
            message,
            type
        } = req.body;



        const notification = await Notification.create({

            project:req.project._id,

            user:null,

            audience:"all",

            title,

            message,

            type:type || "info"

        });



        res.json({

            success:true,

            message:"Broadcast created",

            data:notification

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};








const getMyNotifications = async(req,res)=>{

    try{


        const notifications = await Notification.find({

            project:req.project._id,

            $or:[

                {
                    user:req.user.id
                },

                {
                    audience:"all"
                }

            ]

        })

        .sort({

            createdAt:-1

        });



        res.json({

            success:true,

            data:notifications

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};





module.exports = {

    sendToUser,

    broadcast,

    getMyNotifications

};
