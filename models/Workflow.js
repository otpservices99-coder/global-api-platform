const mongoose = require("mongoose");


const workflowSchema = new mongoose.Schema({

project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


name:{

type:String,

required:true

},


trigger:{

type:mongoose.Schema.Types.Mixed,

default:{}

},


conditions:{

type:Array,

default:[]

},


actions:{

type:Array,

default:[]

},


enabled:{

type:Boolean,

default:true

}


},
{
timestamps:true
});


module.exports =
mongoose.model(
"Workflow",
workflowSchema
);
