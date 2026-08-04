const Event = require("../models/Event");

const {
    processWorkflow
} = require("./workflowEngine");



/*
 Global Event Emitter

 Any project can emit any event:

 video.completed
 booking.created
 order.paid
 anything.custom

 The platform does not care about the meaning.
 Workflows decide what happens.

*/



const emitEvent = async ({

    projectId,

    name,

    entityType = null,

    entityId = null,

    userId = null,

    data = {},

    metadata = {}

}) => {


    try {


        const event = await Event.create({

            project: projectId,

            name,

            entityType,

            entityId,

            userId,

            data,

            metadata,

            processed:false

        });



        console.log(
            "Event created:",
            name
        );



        await processWorkflow(

            projectId,

            event

        );



        event.processed = true;

        await event.save();



        return event;



    } catch(error){


        console.error(
            "Event emitter error:",
            error.message
        );


        throw error;


    }


};




module.exports = {

    emitEvent

};
