const Project = require("../models/Project");


module.exports = async function(req,res,next){


try{


const key =
req.headers["x-api-key"];



if(!key){

return res.status(400).json({

success:false,

message:"API Key missing"

});

}



const project = await Project.findOne({

$or:[

{
apiKey:key
},

{
"apiKeys.key":key
}

]

});



if(!project){

return res.status(401).json({

success:false,

message:"Invalid API Key"

});

}



let apiKeyRecord = null;



if(project.apiKeys && project.apiKeys.length){


apiKeyRecord =
project.apiKeys.find(
item=>item.key===key
);


}



if(apiKeyRecord){


if(apiKeyRecord.status!=="active"){

return res.status(401).json({

success:false,

message:"API Key inactive"

});

}


apiKeyRecord.lastUsed =
new Date();


await project.save();


}



req.project = project;

req.apiKey = apiKeyRecord || {

key:key,

project:project._id

};



next();



}catch(error){


console.error(error);


res.status(500).json({

success:false,

message:"Project authentication failed"

});


}


};
