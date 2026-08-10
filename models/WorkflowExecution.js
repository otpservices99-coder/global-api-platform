const mongoose = require("mongoose");


const workflowExecutionSchema = new mongoose.Schema({

    project:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"Project",

        required:true

    },


    workflow:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"Workflow",

        required:true

    },


    event:{

        type:String,

        required:true

    },


    entityType:{

        type:String,

        default:null

    },


    entityId:{

        type:String,

        default:null

    },


    status:{

        type:String,

        enum:[

            "running",

            "success",

            "failed"

        ],

        default:"running"

    },


    actions:{

        type:Array,

        default:[]

    },


    error:{

        type:String,

        default:null

    },


    duration:{

        type:Number,

        default:0

    }


},
{
    timestamps:true
});


module.exports =
mongoose.model(
    "WorkflowExecution",
    workflowExecutionSchema
);
