const WorkflowExecution =
require("../models/WorkflowExecution");





const startExecution = async({

    project,

    workflow,

    event

}) => {


    return await WorkflowExecution.create({

        project,

        workflow:workflow._id,

        event:event.name,

        entityType:event.entityType,

        entityId:event.entityId,

        status:"running"

    });


};








const finishExecution = async(

    executionId,

    data

)=>{


    return await WorkflowExecution.findByIdAndUpdate(

        executionId,

        {

            status:data.status,

            actions:data.actions || [],

            error:data.error || null,

            duration:data.duration || 0

        },

        {

            new:true

        }

    );


};






module.exports = {

    startExecution,

    finishExecution

};
