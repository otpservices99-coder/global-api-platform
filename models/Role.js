const mongoose=require("mongoose");

const roleSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

name:{
type:String,
required:true
},

description:{
type:String,
default:""
},

permissions:[
{
type:mongoose.Schema.Types.ObjectId,
ref:"Permission"
}
],

enabled:{
type:Boolean,
default:true
}

},{
timestamps:true
});


module.exports=mongoose.model(
"Role",
roleSchema
);
