const mongoose = require("mongoose");


const notificationSchema =
new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},


user:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
required:true
},


title:{
type:String,
required:true
},


message:{
type:String,
default:""
},


type:{
type:String,
default:"system"
},


read:{
type:Boolean,
default:false
}


},{
timestamps:true
});



module.exports =
mongoose.model(
"Notification",
notificationSchema
);
