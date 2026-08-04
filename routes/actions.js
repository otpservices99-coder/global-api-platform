const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const Action = require("../models/Action");



// CREATE ACTION

router.post(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const action = await Action.create({

project:req.project._id,

name:req.body.name,

description:req.body.description || "",

config:req.body.config || {}

});



res.json({

success:true,

message:"Action created",

data:action

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// GET ACTIONS

router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const actions = await Action.find({

project:req.project._id

});



res.json({

success:true,

data:actions

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// GET SINGLE ACTION

router.get(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const action = await Action.findOne({

_id:req.params.id,

project:req.project._id

});



if(!action){

return res.status(404).json({

success:false,

message:"Action not found"

});

}



res.json({

success:true,

data:action

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// UPDATE ACTION

router.put(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const action = await Action.findOneAndUpdate(

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

message:"Action updated",

data:action

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





// DELETE ACTION

router.delete(
"/:id",
project,
protect,
admin,
async(req,res)=>{


try{


await Action.deleteOne({

_id:req.params.id,

project:req.project._id

});



res.json({

success:true,

message:"Action deleted"

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});



module.exports = router;
