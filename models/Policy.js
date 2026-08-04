const mongoose = require("mongoose");

const policySchema = new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

name:{
type:String,
required:true
},

priority:{
type:Number,
default:100
},

enabled:{
type:Boolean,
default:true
},

rules:[{

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
enum:["allow","deny"],
default:"allow"
},

conditions:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

}]

},{
timestamps:true
});

module.exports =
mongoose.model(
"Policy",
policySchema
);
