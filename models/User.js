const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

username:{
type:String,
required:true,
trim:true
},

email:{
type:String,
required:true,
unique:true,
lowercase:true,
trim:true
},

password:{
type:String,
required:true
},

platformRole:{
type:String,
enum:[
"super_admin",
"user"
],
default:"user"
},

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
default:null
},

role:{
type:mongoose.Schema.Types.ObjectId,
ref:"Role",
default:null
},

status:{
type:String,
enum:[
"active",
"suspended",
"blocked"
],
default:"active"
},

profile:{
type:mongoose.Schema.Types.Mixed,
default:{}
},

metadata:{
type:mongoose.Schema.Types.Mixed,
default:{}
},

lastLogin:{
type:Date,
default:null
}

},{
timestamps:true
});

module.exports =
mongoose.model(
"User",
userSchema
);
