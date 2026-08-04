const Event = require("../models/Event");
const rewardEngine = require("./rewardEngine");

const process = async ({

    project,

    user,

    eventKey,

    payload = {}

}) => {

    const event = await Event.findOne({

        project: project._id,

        key: eventKey,

        enabled: true

    });

    if (!event) {

        throw new Error("Event not found");

    }

    const result = await rewardEngine.reward({

        project,

        user,

        amount: event.rewardValue,

        source: event.key,

        description: event.name,

        metadata: payload

    });

    return {

        success: true,

        event,

        reward: result

    };

};

module.exports = {

    process

};
