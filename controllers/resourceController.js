const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");

const validate = require("../services/schemaValidator");
const {
    buildQuery,
    buildOptions
} = require("../services/queryEngine");



// CREATE RECORD

exports.create = async (req,res)=>{

try{

const resource = await Resource.findOne({

project:req.project._id,

name:req.params.resource,

enabled:true

});


if(!resource){

return res.status(404).json({

success:false,

message:"Resource not found"

});

}



const schema = await Schema.findOne({

project:req.project._id,

resource:resource._id

});



if(schema){

const validation = validate(
schema,
req.body
);


if(!validation.valid){

return res.status(400).json({

success:false,

errors:validation.errors

});

}

}



const record = await ResourceData.create({

project:req.project._id,

resource:resource._id,

data:req.body

});


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

};






// GET RECORDS

exports.find = async(req,res)=>{

try{


const resource = await Resource.findOne({

project:req.project._id,

name:req.params.resource

});


if(!resource){

return res.status(404).json({

success:false,

message:"Resource not found"

});

}



const query = buildQuery(
req.query
);


query.project=req.project._id;

query.resource=resource._id;



const options = buildOptions(
req.query
);



let records = ResourceData.find(query);



if(options.sort){

records=records.sort(
options.sort
);

}


if(options.select){

records=records.select(
options.select
);

}


if(options.limit){

records=records.limit(
options.limit
);

}


if(options.page){

records=records.skip(
(options.page-1) *
(options.limit || 20)
);

}



records=await records;



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

};






// GET SINGLE

exports.findOne = async(req,res)=>{

try{


const record =
await ResourceData.findOne({

project:req.project._id,

_id:req.params.id

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

};







// UPDATE

exports.update = async(req,res)=>{

try{


const record =
await ResourceData.findOneAndUpdate(

{

project:req.project._id,

_id:req.params.id

},

{

data:req.body

},

{

new:true

}

);



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

};







// DELETE

exports.remove = async(req,res)=>{

try{


await ResourceData.deleteOne({

project:req.project._id,

_id:req.params.id

});


res.json({

success:true,

message:"Deleted"

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};
