const mongoose=require("mongoose");


const auditSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

user:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
default:null
},

action:{
type:String,
required:true
},

resource:{
type:String,
default:null
},

recordId:{
type:String,
default:null
},

details:{
type:mongoose.Schema.Types.Mixed,
default:{}
},

ip:{
type:String,
default:null
}

},{
timestamps:true
});


module.exports=
mongoose.model(
"AuditLog",
auditSchema
);
