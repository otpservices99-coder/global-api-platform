const mongoose = require("mongoose");


const ruleSchema = new mongoose.Schema({

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

type:mongoose.Schema.Types.Mixed,

default:{}

},


actions:{

type:mongoose.Schema.Types.Mixed,

default:[]

},


status:{

type:String,

default:"active"

}


},
{
timestamps:true
});


module.exports = mongoose.model(
"Rule",
ruleSchema
);
