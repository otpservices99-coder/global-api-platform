const mongoose = require("mongoose");

const resourceDataSchema = new mongoose.Schema({

project:{
type:mongoose.Schema.Types.ObjectId,
ref:"Project",
required:true
},

resource:{
type:mongoose.Schema.Types.ObjectId,
ref:"Resource",
required:true
},

data:{
type:mongoose.Schema.Types.Mixed,
default:{}
},

metadata:{
type:mongoose.Schema.Types.Mixed,
default:{}
}

},{
timestamps:true
});

module.exports =
mongoose.model(
"ResourceData",
resourceDataSchema
);
