const Action = require("../models/Action");

const {
    list
} = require("../handlers");


const loadActions = async (projectId) => {

    if (!projectId) {
        throw new Error("Project ID is required");
    }


    const actions = await Action.find({
        project: projectId,
        enabled: true
    });


    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | The loader no longer creates fake handlers.
    |
    | A database Action must either:
    |
    | 1. Have a real registered handler
    |
    | OR
    |
    | 2. Be a universal action handled by universalActionEngine.
    |
    |--------------------------------------------------------------------------
    */


    const registeredHandlers =
        new Set(list());


    for (const action of actions) {

        const config =
            action.config || {};

        const operation =
            action.operation ||
            config.operation ||
            null;

        const resource =
            action.resource ||
            config.resource ||
            null;


        const hasHandler =
            registeredHandlers.has(
                action.name
            );


        const isUniversal =
            action.type === "universal" ||
            (
                resource &&
                operation
            );


        /*
        |--------------------------------------------------------------------------
        | Report invalid action definitions.
        |--------------------------------------------------------------------------
        */

        if (
            !hasHandler &&
            !isUniversal
        ) {

            console.warn(
                "⚠ Action has no handler:",
                action.name
            );

        }

    }


    return actions;

};


module.exports = {
    loadActions
};
