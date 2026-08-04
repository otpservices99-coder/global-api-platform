const Rule = require("../models/Rule");
const Action = require("../models/Action");

const {
    execute
} = require("../handlers");



/*
 Global Rule Engine

 Receives:
 - projectId
 - event

 Finds matching rules
 Executes only project-owned actions

*/


const processEvent = async(
projectId,
event
)=>{


try{


const rules = await Rule.find({

project:projectId,

status:"active",

"trigger.event":event.name

});



for(const rule of rules){



console.log(
"Matching rule:",
rule.name
);




for(const action of rule.actions){



const actionRecord =
await Action.findOne({

project:projectId,

name:action.handler,

enabled:true

});





if(!actionRecord){


console.log(

"Action unavailable:",
action.handler

);


continue;


}





const result =
await execute(

action.handler,

{


projectId,

event,

data:action.data,


actionConfig:
actionRecord.config


}

);





console.log(

"Action result:",

result

);



}



}



}catch(error){


console.error(

"Rule engine error:",

error.message

);


}



};



module.exports = {

processEvent

};
