const mongoose=require("mongoose");


const fileSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

name:{
type:String,
required:true
},

provider:{
type:String,
default:"local"
},

path:{
type:String,
required:true
},

url:{
type:String,
default:""
},

size:{
type:Number,
default:0
},

mime:{
type:String,
default:""
}

},{
timestamps:true
});


module.exports=mongoose.model(
"File",
fileSchema
);
