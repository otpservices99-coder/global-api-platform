const platform = require("./platformService");

const Transaction = require("../models/Transaction");

const Referral = require("../models/Referral");

const ReferralCommission = require("../models/ReferralCommission");

const User = require("../models/User");



const reward = async ({

    project,

    user,

    amount,

    source,

    description,

    metadata = {}

}) => {

    if (!project) {

        throw new Error("Project is required");

    }

    if (!user) {

        throw new Error("User is required");

    }

    amount = Number(amount);

    if (amount <= 0) {

        throw new Error("Invalid reward amount");

    }



    // Credit wallet

    await platform.addBalance(

        project._id,

        user._id,

        amount,

        description || source

    );



    // Save transaction

    const transaction = await Transaction.create({

        project: project._id,

        user: user._id,

        type: "earning",

        amount,

        description: description || source,

        status: "completed",

        metadata

    });



    return {

        success: true,

        transaction

    };

};



module.exports = {

    reward

};
