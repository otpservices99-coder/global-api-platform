const Schema = require("../models/Schema");

const Resource = require("../models/Resource");



// CREATE SCHEMA

exports.create = async(req,res)=>{

try{


const resource =
await Resource.findOne({

project:req.project._id,

name:req.body.resource

});


if(!resource){

return res.status(404).json({

success:false,

message:"Resource not found"

});

}



const existing =
await Schema.findOne({

project:req.project._id,

resource:resource._id

});


if(existing){

return res.status(400).json({

success:false,

message:"Schema already exists"

});

}



const schema =
await Schema.create({

project:req.project._id,

resource:resource._id,

fields:req.body.fields || []

});



res.status(201).json({

success:true,

message:"Schema created",

data:schema

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};





// GET SCHEMAS

exports.list = async(req,res)=>{

try{


const schemas =
await Schema.find({

project:req.project._id

})
.populate("resource");



res.json({

success:true,

data:schemas

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};
