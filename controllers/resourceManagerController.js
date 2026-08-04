const Resource = require("../models/Resource");



// CREATE RESOURCE

exports.create = async(req,res)=>{

try{


const existing =
await Resource.findOne({

project:req.project._id,

name:req.body.name

});


if(existing){

return res.status(400).json({

success:false,

message:"Resource already exists"

});

}



const resource =
await Resource.create({

project:req.project._id,

name:req.body.name,

displayName:
req.body.displayName || "",

description:
req.body.description || "",

icon:
req.body.icon || "",

enabled:true,

settings:
req.body.settings || {}

});



res.status(201).json({

success:true,

message:"Resource created",

data:resource

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};





// LIST RESOURCES

exports.list = async(req,res)=>{

try{


const resources =
await Resource.find({

project:req.project._id

})
.sort({
createdAt:-1
});



res.json({

success:true,

data:resources

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}

};
