const Entity = require("../models/Entity");


// CREATE ANY ENTITY
const createEntity = async(req,res)=>{

    try{

        const entity = await Entity.create({

            project:req.project._id,

            entityType:req.body.entityType,

            owner:req.body.owner || null,

            data:req.body.data || {},

            metadata:req.body.metadata || {}

        });


        res.json({

            success:true,

            data:entity

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// GET ENTITIES
const getEntities = async(req,res)=>{

    try{


        const query={

            project:req.project._id

        };


        if(req.query.entityType){

            query.entityType=req.query.entityType;

        }


        const entities = await Entity.find(query)
        .sort({
            createdAt:-1
        });



        res.json({

            success:true,

            data:entities

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// GET ONE ENTITY
const getEntity = async(req,res)=>{

    try{


        const entity = await Entity.findOne({

            _id:req.params.id,

            project:req.project._id

        });


        if(!entity){

            return res.status(404).json({

                success:false,

                message:"Entity not found"

            });

        }


        res.json({

            success:true,

            data:entity

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// UPDATE ENTITY
const updateEntity = async(req,res)=>{

    try{


        const entity = await Entity.findOneAndUpdate(

        {
            _id:req.params.id,
            project:req.project._id
        },

        {
            $set:req.body
        },

        {
            new:true
        });


        res.json({

            success:true,

            data:entity

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



// DELETE ENTITY
const deleteEntity = async(req,res)=>{

    try{


        await Entity.findOneAndDelete({

            _id:req.params.id,

            project:req.project._id

        });


        res.json({

            success:true,

            message:"Deleted"

        });



    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



module.exports={

createEntity,

getEntities,

getEntity,

updateEntity,

deleteEntity

};
