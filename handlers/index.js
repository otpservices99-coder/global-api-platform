const Action = require("../models/Action");



const registry = {};




// Register action handler

const register = (
name,
handler
)=>{


registry[name] = handler;


};





// Execute any action

const execute = async(
name,
context
)=>{


const action =
await Action.findOne({

project:context.projectId,

name:name,

enabled:true

});



if(!action){


return {

success:false,

message:"Action not found",

action:name

};


}




const handler =
registry[name];



if(!handler){


return {

success:false,

message:"Handler not registered",

action:name

};


}





return await handler(context);



};







// Default generic action

register(
"custom.test",
async(context)=>{


console.log(
"Executing custom.test",
context
);



return {

success:true,

action:"custom.test"

};


});





module.exports = {

execute,

register

};
