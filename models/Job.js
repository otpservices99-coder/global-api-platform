const mongoose=require("mongoose");


const jobSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

name:{
type:String,
required:true
},

type:{
type:String,
enum:[
"once",
"interval",
"cron"
],
default:"once"
},

schedule:{
type:String,
required:true
},

action:{
type:Object,
default:{}
},

enabled:{
type:Boolean,
default:true
},

lastRun:{
type:Date,
default:null
},

nextRun:{
type:Date,
default:null
}

},{
timestamps:true
});


module.exports=mongoose.model(
"Job",
jobSchema
);
