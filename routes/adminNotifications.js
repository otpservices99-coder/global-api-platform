const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const Notification = require("../models/Notification");


router.get(
    "/users/:userId",
    protect,
    admin,
    async (req,res)=>{

        try {

            const notifications =
                await Notification.find({
                    user:req.params.userId
                })
                .sort({
                    createdAt:-1
                });


            res.json({
                success:true,
                data:notifications
            });


        } catch(err){

            res.status(500).json({
                success:false,
                message:err.message
            });

        }

    }
);


module.exports = router;
