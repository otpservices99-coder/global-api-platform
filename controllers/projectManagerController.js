const Project = require("../models/Project");

const ApiKey = require("../models/ApiKey");

const generateKey =
require("../utils/generateKey");




// Create project + API key

exports.createProject = async(req,res)=>{


try{


const project =
await Project.create({

name:req.body.name,

description:req.body.description || ""

});



const key =
await ApiKey.create({

project:project._id,

key:generateKey(),

name:"Default API Key",

permissions:[
"*"
]

});



res.json({

success:true,

data:{

project,

apiKey:key.key

}

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


};
