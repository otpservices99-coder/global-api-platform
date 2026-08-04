const express = require("express");

const router = express.Router();


const Event = require("../models/Event");

const project =
require("../middleware/project");


const {
processWorkflow
} = require("../services/workflowEngine");





// Receive any project event

router.post(
"/",
project,
async(req,res)=>{


try{


const event =
await Event.create({

project:req.project._id,

name:req.body.event,

entityType:req.body.entityType || null,

entityId:req.body.entityId || null,

userId:req.body.userId || null,

data:req.body.data || {},

metadata:req.body.metadata || {},

processed:false

});





// Send event into dynamic workflow engine

await processWorkflow(

req.project._id,

event

);





event.processed = true;

await event.save();





res.json({

success:true,

message:"Event received",

data:event

});



}catch(error){


console.error(error);


res.status(500).json({

success:false,

message:error.message

});


}


});





module.exports = router;
