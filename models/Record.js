const mongoose = require("mongoose");


const recordSchema = new mongoose.Schema({


project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


type:{

type:String,

required:true

},


data:{

type:mongoose.Schema.Types.Mixed,

default:{}

},


metadata:{

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
"Record",
recordSchema
);
