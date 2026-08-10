const crypto = require("crypto");

const ApiKey = require("../models/ApiKey");
const Project = require("../models/Project");



const createApiKey = async(req,res)=>{

try{

const projectId=req.project._id;


const {
name
}=req.body;


const key=crypto
.randomBytes(32)
.toString("hex");


const apiKey=await ApiKey.create({

project:projectId,

key,

name:name || "Default Key"

});


res.json({

success:true,

message:"API key created",

data:{

id:apiKey._id,

key:apiKey.key,

name:apiKey.name

}

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




const getApiKeys = async(req,res)=>{

try{


const keys=await ApiKey.find({

project:req.project._id

})
.select("-__v");


res.json({

success:true,

data:keys

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




const revokeApiKey = async(req,res)=>{

try{


const key=await ApiKey.findOne({

_id:req.params.id,

project:req.project._id

});


if(!key){

return res.status(404).json({

success:false,

message:"API key not found"

});

}



key.active=false;

await key.save();



res.json({

success:true,

message:"API key revoked"

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




module.exports={

createApiKey,

getApiKeys,

revokeApiKey

};
