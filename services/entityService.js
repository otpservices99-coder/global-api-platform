const Entity = require("../models/Entity");


/*
    Global Entity Engine

    This handles ANY project data:
    - rewards
    - referrals
    - rooms
    - products
    - bookings
    - posts
    - tasks
    - anything dynamic

    The API decides the module/type.
    The backend only stores and manages it.
*/


const create = async ({
    project,
    module,
    type = "default",
    owner = null,
    data = {},
    metadata = {}
}) => {

    return await Entity.create({

        project,

        module,

        type,

        owner,

        data,

        metadata

    });

};



const find = async ({
    project,
    module,
    type = null,
    owner = null,
    status = null
}) => {


    const query = {
        project,
        module
    };


    if(type)
        query.type = type;


    if(owner)
        query.owner = owner;


    if(status)
        query.status = status;



    return await Entity.find(query)
        .sort({
            createdAt:-1
        });

};



const findOne = async ({
    project,
    id
})=>{


    return await Entity.findOne({

        _id:id,

        project

    });

};



const update = async ({
    project,
    id,
    data
})=>{


    return await Entity.findOneAndUpdate(

        {
            _id:id,
            project
        },

        {
            $set:data
        },

        {
            new:true
        }

    );

};



const remove = async ({
    project,
    id
})=>{


    return await Entity.findOneAndDelete({

        _id:id,

        project

    });

};



module.exports = {

    create,

    find,

    findOne,

    update,

    remove

};
