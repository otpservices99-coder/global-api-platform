const mongoose = require("mongoose");


const entitySchema = new mongoose.Schema({

    project:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"Project",

        required:true

    },


    type:{

        type:String,

        required:true

    },


    name:{

        type:String,

        required:true

    },


    data:{

        type:mongoose.Schema.Types.Mixed,

        default:{}

    },


    status:{

        type:String,

        default:"active"

    }


},
{
timestamps:true
});


module.exports =
mongoose.model(
"Entity",
entitySchema
);
