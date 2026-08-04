const Plugin=require("../models/Plugin");

const registry={};

exports.register=(name,handler)=>{

registry[name]=handler;

};

exports.execute=async(context,action)=>{

const plugin=await Plugin.findOne({

project:context.event.project,

name:action.plugin,

enabled:true

});

if(!plugin){

throw new Error("Plugin not installed");

}

const handler=registry[action.plugin];

if(!handler){

throw new Error("Plugin not registered");

}

return handler({

context,

config:plugin.config,

operation:action.operation,

data:action.data

});

};
