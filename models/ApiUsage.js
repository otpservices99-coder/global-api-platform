const mongoose=require("mongoose");


const apiUsageSchema=new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

endpoint:{
type:String,
required:true
},

method:{
type:String,
required:true
},

count:{
type:Number,
default:1
},

ip:{
type:String,
default:""
}

},{
timestamps:true
});


module.exports =
mongoose.model(
"ApiUsage",
apiUsageSchema
);
