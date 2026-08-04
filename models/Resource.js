const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({

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

displayName:{
type:String,
default:""
},

description:{
type:String,
default:""
},

icon:{
type:String,
default:""
},

enabled:{
type:Boolean,
default:true
},

settings:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

},{
timestamps:true
});

module.exports =
mongoose.model(
"Resource",
resourceSchema
);
