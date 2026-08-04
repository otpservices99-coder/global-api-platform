const mongoose = require("mongoose");


const eventSchema = new mongoose.Schema(
{

project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


name:{

type:String,

required:true,

trim:true

},


entityType:{

type:String,

default:null

},


entityId:{

type:String,

default:null

},


userId:{

type:String,

default:null

},


data:{

type:mongoose.Schema.Types.Mixed,

default:{}

},


metadata:{

type:mongoose.Schema.Types.Mixed,

default:{}

},


processed:{

type:Boolean,

default:false

}


},
{
timestamps:true
}

);



module.exports = mongoose.model(
"Event",
eventSchema
);
