const Action = require("../models/Action");

const {
    register,
    list
} = require("../handlers");


const loadActions = async (projectId) => {

    try {

        const actions = await Action.find({
            project: projectId,
            enabled: true
        });


        const registeredHandlers = new Set(list());


        for (const action of actions) {

            if (registeredHandlers.has(action.name)) {
                continue;
            }


            register(
                action.name,

                async (context) => {

                    console.log(
                        "Dynamic action:",
                        action.name
                    );

                    console.log(
                        "Config:",
                        action.config
                    );


                    return {
                        success: true,
                        action: action.name
                    };

                }
            );


            registeredHandlers.add(action.name);

        }


        return actions;


    } catch (error) {

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
