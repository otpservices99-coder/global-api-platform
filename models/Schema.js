const mongoose = require("mongoose");


const schemaSchema = new mongoose.Schema({


project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},


resource:{
type:mongoose.Schema.Types.ObjectId,
ref:"Resource",
required:true
},


fields:[

{

name:{
type:String,
required:true,
trim:true
},


type:{
type:String,
required:true,
trim:true
},


required:{
type:Boolean,
default:false
},


defaultValue:{
type:mongoose.Schema.Types.Mixed,
default:null
},


options:{
type:[String],
default:[]
}

}

]


},{
timestamps:true
});


module.exports =
mongoose.model(
"Schema",
schemaSchema
);
