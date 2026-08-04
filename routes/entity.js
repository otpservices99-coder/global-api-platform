const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const project = require("../middleware/project");


const eventEngine = require("../engine/eventEngine");



router.post(
"/event",
project,
async(req,res)=>{


try{


const result =
await eventEngine.process({

project:req.project._id,

user:req.user ? req.user.id : null,

event:req.body.event,

data:req.body.data || {}

});



res.json({

success:true,

message:"Event processed",

data:result

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}



});



module.exports = router;
