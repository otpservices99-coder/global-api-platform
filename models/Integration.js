const mongoose=require("mongoose");

const integrationSchema=new mongoose.Schema({

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
required:true
},

enabled:{
type:Boolean,
default:true
},

credentials:{
type:mongoose.Schema.Types.Mixed,
default:{}
},

settings:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

},{
timestamps:true
});

module.exports=mongoose.model(
"Integration",
integrationSchema
);
