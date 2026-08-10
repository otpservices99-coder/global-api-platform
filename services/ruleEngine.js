const Rule = require("../models/Rule");

const {
    processActions
} = require("./actionEngine");



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



await processActions(

{
    ...event.toObject ? event.toObject() : event,
    project:projectId
},

rule.actions

);



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
