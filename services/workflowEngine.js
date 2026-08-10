const Workflow = require("../models/Workflow");

const {
    execute
} = require("../handlers");


const {
    resolveObject
} = require("./variableResolver");


const {
    startExecution,
    finishExecution
} = require("./workflowLogger");







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


        const started = Date.now();



        let execution;



        try {



            execution =

                await startExecution({

                    project:projectId,

                    workflow,

                    event

                });





            let passed = true;



            const context = {

                event,

                data:event.data

            };






            for(const condition of workflow.conditions){



                if(

                    !checkCondition(

                        condition,

                        context

                    )

                ){

                    passed=false;

                    break;

                }


            }






            if(!passed){



                await finishExecution(

                    execution._id,

                    {

                        status:"success",

                        actions:[

                            {

                                message:"Conditions not met"

                            }

                        ],

                        duration:

                            Date.now() - started

                    }

                );



                continue;

            }








            const results=[];







            for(const action of workflow.actions){



                const resolvedData =

                    resolveObject(

                        action.data,

                        context

                    );






                const result =

                    await execute(

                        action.handler,

                        {

                            projectId,

                            event,

                            data:resolvedData,

                            userId:event.entityId

                        }

                    );





                results.push({

                    handler:action.handler,

                    result

                });





            }








            await finishExecution(

                execution._id,

                {

                    status:"success",

                    actions:results,

                    duration:

                        Date.now() - started

                }

            );







        } catch(error){



            console.error(

                "Workflow Error:",

                error.message

            );




            if(execution){


                await finishExecution(

                    execution._id,

                    {

                        status:"failed",

                        error:error.message,

                        duration:

                            Date.now() - started

                    }

                );


            }


        }


    }


};







module.exports = {

    processWorkflow,

    checkCondition

};
