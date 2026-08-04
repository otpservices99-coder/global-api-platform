const mongoose=require("mongoose");

const pluginSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

name:{
type:String,
required:true
},

version:{
type:String,
default:"1.0.0"
},

description:{
type:String,
default:""
},

enabled:{
type:Boolean,
default:true
},

operations:[
{
type:String
}
],

config:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

},{
timestamps:true
});

module.exports=mongoose.model(
"Plugin",
pluginSchema
);
