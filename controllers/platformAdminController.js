const Project=require("../models/Project");
const User=require("../models/User");
const ApiUsage=require("../models/ApiUsage");


exports.overview=async(req,res)=>{

try{


const projects=
await Project.countDocuments();


const users=
await User.countDocuments();


const apiCalls=
await ApiUsage.countDocuments();



res.json({

success:true,

data:{

projects,

users,

apiCalls

}

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};





exports.projects=async(req,res)=>{


const projects=
await Project.find();


res.json({

success:true,

data:projects

});


};





exports.disableProject=async(req,res)=>{


const project=
await Project.findByIdAndUpdate(

req.params.id,

{
enabled:false
},

{
new:true
}

);


res.json({

success:true,

data:project

});


};





exports.enableProject=async(req,res)=>{


const project=
await Project.findByIdAndUpdate(

req.params.id,

{
enabled:true
},

{
new:true
}

);


res.json({

success:true,

data:project

});


};
