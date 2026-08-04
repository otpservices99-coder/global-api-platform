const express = require("express");

const router = express.Router();


const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const Workflow =
require("../models/Workflow");





// Create workflow

router.post(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const workflow =
await Workflow.create({

project:req.project._id,

name:req.body.name,

trigger:req.body.trigger || {},

conditions:req.body.conditions || [],

actions:req.body.actions || []

});



res.json({

success:true,

message:"Workflow created",

data:workflow

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});








// List workflows

router.get(
"/",
project,
protect,
async(req,res)=>{


const workflows =
await Workflow.find({

project:req.project._id

})
.sort({
createdAt:-1
});



res.json({

success:true,

data:workflows

});


});








// Update workflow

router.put(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const workflow =
await Workflow.findOneAndUpdate(

{

_id:req.params.id,

project:req.project._id

},

req.body,

{
new:true
}

);



if(!workflow){

return res.status(404).json({

success:false,

message:"Workflow not found"

});

}



res.json({

success:true,

data:workflow

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});








// Delete workflow

router.delete(
"/:id",
project,
protect,
admin,
async(req,res)=>{


await Workflow.findOneAndDelete({

_id:req.params.id,

project:req.project._id

});


res.json({

success:true,

message:"Workflow deleted"

});


});



module.exports = router;
