const {
    execute
}=require("../handlers");


const {
    loadActions
}=require("./actionLoader");



const processActions = async(event, actions)=>{


    await loadActions(
        event.project
    );



    for(const action of actions){


        try{


            const result = await execute(

                action.handler,

                {

                    event,

                    data:action.data || {}

                }

            );


            console.log(
                "Action result:",
                result
            );


        }catch(error){


            console.error(
                "Action error:",
                error.message
            );


        }


    }


};



module.exports = {
    processActions
};
