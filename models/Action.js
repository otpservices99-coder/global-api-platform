const mongoose = require("mongoose");


const actionSchema = new mongoose.Schema({

project:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Project",
    required:true
},


name:{
    type:String,
    required:true
},


description:{
    type:String,
    default:""
},


enabled:{
    type:Boolean,
    default:true
},


config:{
    type:mongoose.Schema.Types.Mixed,
    default:{}
}


},{
timestamps:true
});


module.exports = mongoose.model(
"Action",
actionSchema
);
