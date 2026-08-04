const Action = require("../models/Action");

const {
    register
}=require("../handlers");



/*
    Dynamic Action Loader

    Reads enabled actions from database
    and registers them.

*/


const loadActions = async(projectId)=>{


try{


const actions = await Action.find({

project:projectId,

enabled:true

});



for(const action of actions){


    /*
        Temporary generic executor.

        Later this can connect to:
        external APIs,
        scripts,
        workflows,
        webhooks,
        etc.

        The registry stays unchanged.
    */


    register(

        action.name,

        async(context)=>{


            console.log(
                "Dynamic action:",
                action.name
            );


            console.log(
                "Config:",
                action.config
            );


            console.log(
                "Context:",
                context
            );


            return {

                success:true,

                action:action.name

            };


        }

    );


}



return actions;



}catch(error){


console.error(
"Action loader error:",
error.message
);


throw error;


}


};



module.exports = {
    loadActions
};
