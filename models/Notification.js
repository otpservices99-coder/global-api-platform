const mongoose = require("mongoose");


const notificationSchema = new mongoose.Schema({


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


    audience:{
        type:String,

        enum:[
            "user",
            "all"
        ],

        default:"user"
    },


    title:{
        type:String,
        required:true
    },


    message:{
        type:String,
        required:true
    },


    type:{
        type:String,

        enum:[
            "info",
            "success",
            "warning",
            "error",
            "system"
        ],

        default:"info"
    },


    read:{
        type:Boolean,
        default:false
    },


    metadata:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    }


},{
    timestamps:true
});


module.exports = mongoose.model(
    "Notification",
    notificationSchema
);
