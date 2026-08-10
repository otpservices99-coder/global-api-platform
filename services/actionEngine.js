const Action = require("../models/Action");

const {
    execute
} = require("../handlers");

const {
    loadActions
} = require("./actionLoader");

const audit = require("./auditService");



const processAction = async(context)=>{


try{


const {

projectId,

action,

user,

actorId,

data = {},

req

}=context;



await loadActions(projectId);



const actionRecord = await Action.findOne({

project:projectId,

name:action,

enabled:true

});



if(!actionRecord){

return {

success:false,

message:"Action not found",

action

};

}



const result = await execute(

action,

{

projectId,

userId:user?._id || null,

actorId,

data,

req

}

);



await audit.log({

project:projectId,

actor:actorId,

user:data.userId || user?._id || null,

action,

resource:actionRecord.config?.resource || "",

metadata:data,

req

});



return result;



}catch(error){


console.error(

"Action execution error:",

error.message

);



return {

success:false,

message:error.message

};


}


};





const processActions = async(event, actions)=>{


for(const item of actions){


await processAction({

projectId:event.project,

action:item.handler,

user:event.userId ? {
_id:event.userId
}:null,

actorId:event.userId || null,

data:item.data || event.data || {},

event

});


}


};





module.exports = {

processAction,

processActions

};
