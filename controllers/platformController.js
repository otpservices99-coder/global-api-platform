const Project = require("../models/Project");
const User = require("../models/User");
const Event = require("../models/Event");
const Record = require("../models/Record");

const Resource = require("../models/Resource");
const ResourceData = require("../models/ResourceData");
const Schema = require("../models/Schema");

const crypto = require("crypto");




// GLOBAL PLATFORM OVERVIEW

exports.overview = async(req,res)=>{

try{


const [

projects,

activeProjects,

disabledProjects,

users,

events,

records,

resources,

resourceData,

schemas

] = await Promise.all([



Project.countDocuments(),



Project.countDocuments({
status:"active"
}),



Project.countDocuments({
status:"disabled"
}),



User.countDocuments(),



Event.countDocuments(),



Record.countDocuments(),



Resource.countDocuments(),



ResourceData.countDocuments(),



Schema.countDocuments()


]);




// Count embedded API keys

const projectKeys =
await Project.aggregate([

{
$unwind:"$apiKeys"
},

{
$match:{
"apiKeys.status":"active"
}
},

{
$count:"total"
}

]);



res.json({

success:true,

data:{


projects,

activeProjects,

disabledProjects,

users,

events,

records,

resources,

resourceData,

schemas,

apiKeys:
projectKeys[0]?.total || 0


}

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};







// GET ALL PROJECTS

exports.getAllProjects = async(req,res)=>{

try{


const projects =
await Project.find()
.sort({
createdAt:-1
});



res.json({

success:true,

data:projects

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};








// GET SINGLE PROJECT

exports.getProject = async(req,res)=>{

try{


const project =
await Project.findById(
req.params.id
);



if(!project){

return res.status(404).json({

success:false,

message:"Project not found"

});

}



res.json({

success:true,

data:project

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};








// DISABLE PROJECT

exports.disableProject = async(req,res)=>{

try{


const project =
await Project.findByIdAndUpdate(

req.params.id,

{
status:"disabled"
},

{
new:true
}

);



res.json({

success:true,

message:"Project disabled",

data:project

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};








// ENABLE PROJECT

exports.enableProject = async(req,res)=>{

try{


const project =
await Project.findByIdAndUpdate(

req.params.id,

{
status:"active"
},

{
new:true
}

);



res.json({

success:true,

message:"Project enabled",

data:project

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};








// UPDATE PROJECT

exports.updateProject = async(req,res)=>{

try{


const project =
await Project.findByIdAndUpdate(

req.params.id,

req.body,

{
new:true
}

);



res.json({

success:true,

data:project

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};








// ROTATE API KEY

exports.rotateApiKey = async(req,res)=>{

try{


const project =
await Project.findById(
req.params.id
);



if(!project){

return res.status(404).json({

success:false,

message:"Project not found"

});

}



project.apiKeys.forEach(key=>{

key.status="revoked";

});



const newKey =
crypto
.randomBytes(32)
.toString("hex");



project.apiKeys.push({

key:newKey,

name:"rotated",

status:"active"

});



await project.save();



res.json({

success:true,

message:"API key rotated",

data:{
apiKey:newKey
}

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};
