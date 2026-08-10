const User = require("../models/User");
const audit = require("../services/auditService");

const {
    processAction
} = require("../services/actionEngine");



// Get all users

const getUsers = async(req,res)=>{

try{

const users = await User.find({

project:req.project._id

}).select("-password");


res.json({

success:true,

total:users.length,

data:users

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// Get user by ID

const getUserById = async(req,res)=>{

try{

const user = await User.findOne({

_id:req.params.id,

project:req.project._id

}).select("-password");


if(!user){

return res.status(404).json({

success:false,

message:"User not found"

});

}


res.json({

success:true,

data:user

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// Credit user wallet

const creditUser = async(req,res)=>{

try{


const {
amount,
description
}=req.body;



const user = await User.findOne({

_id:req.params.id,

project:req.project._id

});


if(!user){

return res.status(404).json({

success:false,

message:"User not found"

});

}



const result = await processAction({

projectId:req.project._id,

action:"wallet.credit",

user:req.user,

actorId:req.user._id,

data:{

userId:user._id,

amount,

description

},

req

});



if(!result.success){

return res.status(400).json(result);

}



res.json({

success:true,

message:"Wallet credited successfully",

data:result

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// Debit user wallet

const debitUser = async(req,res)=>{

try{


const {
amount,
description
}=req.body;



const user = await User.findOne({

_id:req.params.id,

project:req.project._id

});


if(!user){

return res.status(404).json({

success:false,

message:"User not found"

});

}



const result = await processAction({

projectId:req.project._id,

action:"wallet.debit",

user:req.user,

actorId:req.user._id,

data:{

userId:user._id,

amount,

description

},

req

});



if(!result.success){

return res.status(400).json(result);

}



res.json({

success:true,

message:"Wallet debited successfully",

data:result

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// Update user status

const updateUserStatus = async(req,res)=>{

try{


const {
status
}=req.body;


const user = await User.findOne({

_id:req.params.id,

project:req.project._id

});


if(!user){

return res.status(404).json({

success:false,

message:"User not found"

});

}



const result = await processAction({

projectId:req.project._id,

action:"user.status_update",

user:req.user,

actorId:req.user._id,

data:{

userId:user._id,

status

},

req

});



res.json({

success:true,

message:"User status updated",

data:result

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// Update user role

const updateUserRole = async(req,res)=>{

try{


const {
role
}=req.body;


const user = await User.findOne({

_id:req.params.id,

project:req.project._id

});


if(!user){

return res.status(404).json({

success:false,

message:"User not found"

});

}



const result = await processAction({

projectId:req.project._id,

action:"user.role_update",

user:req.user,

actorId:req.user._id,

data:{

userId:user._id,

role

},

req

});



res.json({

success:true,

message:"User role updated",

data:result

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};



module.exports={

getUsers,

getUserById,

creditUser,

debitUser,

updateUserStatus,

updateUserRole

};
