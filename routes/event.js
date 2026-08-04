const express = require("express");

const router = express.Router();

const project = require("../middleware/project");

const Event = require("../models/Event");

const {
processEvent
}=require("../services/ruleEngine");



router.post(
"/",
project,
async(req,res)=>{


try{


const {
event,
entityType,
entityId,
userId,
data,
metadata
}=req.body;



if(!event){

return res.status(400).json({

success:false,

message:"Event name required"

});

}



const newEvent = await Event.create({

project:req.project._id,

name:event,

entityType,

entityId,

userId,

data:data || {},

metadata:metadata || {}

});



// Send event to rule engine

processEvent(newEvent);



res.json({

success:true,

message:"Event received",

data:newEvent

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});


module.exports = router;
