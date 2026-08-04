const mongoose = require("mongoose");


const schemaDefinition = new mongoose.Schema({

project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


type:{

type:String,

required:true

},


fields:[{

name:String,

type:String,

required:Boolean

}],


active:{

type:Boolean,

default:true

}


},
{
timestamps:true
});


module.exports =
mongoose.model(
"SchemaDefinition",
schemaDefinition
);
