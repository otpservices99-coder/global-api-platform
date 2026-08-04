const mongoose=require("mongoose");

const withdrawalSchema=new mongoose.Schema({

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

    amount:{
        type:Number,
        required:true
    },

    method:String,

    account:String,

    status:{
        type:String,
        enum:[
            "pending",
            "approved",
            "rejected"
        ],
        default:"pending"
    }

},{
    timestamps:true
});

module.exports=mongoose.model(
    "Withdrawal",
    withdrawalSchema
);
