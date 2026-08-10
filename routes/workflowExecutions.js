const express = require("express");

const router = express.Router();


const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");


const WorkflowExecution =
require("../models/WorkflowExecution");





// Get workflow execution history

router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


    try{


        const {
            status,
            page = 1,
            limit = 20
        } = req.query;



        const query = {

            project:req.project._id

        };



        if(status){

            query.status = status;

        }





        const executions =

            await WorkflowExecution.find(query)

            .populate(
                "workflow",
                "name trigger"
            )

            .sort({

                createdAt:-1

            })

            .skip(
                (page - 1) * limit
            )

            .limit(
                Number(limit)
            );





        const total =

            await WorkflowExecution.countDocuments(
                query
            );





        res.json({

            success:true,

            total,

            page:Number(page),

            limit:Number(limit),

            data:executions

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


});







// Get single execution

router.get(
"/:id",
project,
protect,
admin,
async(req,res)=>{


    try{


        const execution =

            await WorkflowExecution.findOne({

                _id:req.params.id,

                project:req.project._id

            })

            .populate(
                "workflow",
                "name trigger actions"
            );




        if(!execution){


            return res.status(404).json({

                success:false,

                message:"Execution not found"

            });


        }





        res.json({

            success:true,

            data:execution

        });




    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


});





module.exports = router;
