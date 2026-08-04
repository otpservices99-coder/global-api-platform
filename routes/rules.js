const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const Rule = require("../models/Rule");



// CREATE RULE

router.post(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const rule = await Rule.create({

project:req.project._id,

name:req.body.name,

trigger:req.body.trigger || {},

conditions:req.body.conditions || {},

actions:req.body.actions || []

});



res.json({

success:true,

message:"Rule created",

data:rule

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// GET RULES

router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const rules = await Rule.find({

project:req.project._id

});



res.json({

success:true,

data:rules

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// GET SINGLE RULE

router.get(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const rule = await Rule.findOne({

_id:req.params.id,

project:req.project._id

});


if(!rule){

return res.status(404).json({

success:false,

message:"Rule not found"

});

}



res.json({

success:true,

data:rule

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// UPDATE RULE

router.put(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const rule = await Rule.findOneAndUpdate(

{

_id:req.params.id,

project:req.project._id

},

req.body,

{
new:true
}

);



res.json({

success:true,

message:"Rule updated",

data:rule

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// DELETE RULE

router.delete(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


await Rule.deleteOne({

_id:req.params.id,

project:req.project._id

});



res.json({

success:true,

message:"Rule deleted"

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});



module.exports = router;
