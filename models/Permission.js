const mongoose=require("mongoose");


const permissionSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

resource:{
type:String,
default:"*"
},

operation:{
type:String,
default:"*"
},

effect:{
type:String,
enum:[
"allow",
"deny"
],
default:"allow"
},

conditions:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

},{
timestamps:true
});


module.exports=mongoose.model(
"Permission",
permissionSchema
);
