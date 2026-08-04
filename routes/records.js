const express = require("express");

const router = express.Router();


const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const Record = require("../models/Record");


const {
    emitEvent
} = require("../services/eventEmitter");


const {
    validateRecord
} = require("../services/schemaValidator");





// Create dynamic record

router.post(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const {

type,

data,

metadata

} = req.body;



if(!type){

return res.status(400).json({

success:false,

message:"Record type required"

});

}




// Validate against project schema

const validation =
await validateRecord(

req.project._id,

type,

data || {}

);



if(!validation.valid){

return res.status(400).json({

success:false,

message:validation.message

});

}




// Create record

const record =
await Record.create({

project:req.project._id,

type,

data:data || {},

metadata:metadata || {}

});





// Emit generic event

await emitEvent({

projectId:req.project._id,

name:"record.created",

entityType:type,

entityId:record._id,

data:record.data,

metadata:record.metadata

});





res.json({

success:true,

message:"Record created",

data:record

});



}catch(error){


console.error(error);


res.status(500).json({

success:false,

message:error.message

});


}


});







// Get records by dynamic type

router.get(
"/:type",
project,
protect,
async(req,res)=>{


try{


const records =
await Record.find({

project:req.project._id,

type:req.params.type

})
.sort({
createdAt:-1
});



res.json({

success:true,

data:records

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});







// Get single record

router.get(
"/item/:id",
project,
protect,
async(req,res)=>{


try{


const record =
await Record.findOne({

_id:req.params.id,

project:req.project._id

});



if(!record){

return res.status(404).json({

success:false,

message:"Record not found"

});

}



res.json({

success:true,

data:record

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});

}


});







// Update dynamic record

router.put(
"/item/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const record =
await Record.findOneAndUpdate(

{

_id:req.params.id,

project:req.project._id

},

{

data:req.body.data,

metadata:req.body.metadata

},

{

new:true

}

);



if(!record){

return res.status(404).json({

success:false,

message:"Record not found"

});

}



await emitEvent({

projectId:req.project._id,

name:"record.updated",

entityType:record.type,

entityId:record._id,

data:record.data,

metadata:record.metadata

});



res.json({

success:true,

message:"Record updated",

data:record

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});







// Delete dynamic record

router.delete(
"/item/:id",
project,
protect,
admin,
async(req,res)=>{


try{


const record =
await Record.findOneAndDelete({

_id:req.params.id,

project:req.project._id

});



if(!record){

return res.status(404).json({

success:false,

message:"Record not found"

});

}



await emitEvent({

projectId:req.project._id,

name:"record.deleted",

entityType:record.type,

entityId:record._id,

data:{}

});



res.json({

success:true,

message:"Record deleted"

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});





module.exports = router;
