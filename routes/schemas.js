const express = require("express");

const router = express.Router();


const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const SchemaDefinition =
require("../models/SchemaDefinition");



// Create schema

router.post(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const schema =
await SchemaDefinition.create({

project:req.project._id,

type:req.body.type,

fields:req.body.fields || []

});


res.json({

success:true,

data:schema

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});



// Get schemas

router.get(
"/",
project,
protect,
async(req,res)=>{


const schemas =
await SchemaDefinition.find({

project:req.project._id

});


res.json({

success:true,

data:schemas

});


});


module.exports = router;
