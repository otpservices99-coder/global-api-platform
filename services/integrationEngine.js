const Integration=require("../models/Integration");

const registry={};

exports.register=(provider,handler)=>{

registry[provider]=handler;

};

exports.execute=async(project,provider,operation,data)=>{

const integration=await Integration.findOne({

project,

provider,

enabled:true

});

if(!integration){

throw new Error("Integration not installed");

}

const handler=registry[provider];

if(!handler){

throw new Error("Provider not registered");

}

return handler({

operation,

credentials:integration.credentials,

settings:integration.settings,

data

});

};
