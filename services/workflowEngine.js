const Workflow = require("../models/Workflow");

const {
    execute
} = require("../handlers");





const checkCondition = (
condition,
context
)=>{


const value =
condition.field
.split(".")
.reduce(
(obj,key)=>obj?.[key],
context
);



switch(condition.operator){


case "==":

return value == condition.value;



case "!=":

return value != condition.value;



case ">":

return value > condition.value;



case "<":

return value < condition.value;



case ">=":

return value >= condition.value;



case "<=":

return value <= condition.value;



default:

return false;


}



};







const processWorkflow = async(
projectId,
event
)=>{


const workflows =
await Workflow.find({

project:projectId,

enabled:true,

"trigger.event":event.name

});




for(const workflow of workflows){



let passed = true;



for(const condition of workflow.conditions){


if(
!checkCondition(
condition,
{
event,
data:event.data
}
)
){

passed=false;

break;

}


}




if(!passed){

continue;

}





console.log(
"Workflow matched:",
workflow.name
);





for(const action of workflow.actions){



const result =
await execute(

action.handler,

{

projectId,

event,

data:action.data

}

);



console.log(
"Workflow action result:",
result
);


}



}



};




module.exports = {

processWorkflow

};
