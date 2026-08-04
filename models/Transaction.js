const mongoose=require("mongoose");

const transactionSchema=new mongoose.Schema({

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

    type:{
        type:String,
        enum:[
            "earning",
            "withdrawal",
            "deposit",
            "bonus",
            "penalty"
        ],
        required:true
    },

    amount:{
        type:Number,
        required:true
    },

    description:{
        type:String,
        default:""
    },

    status:{
        type:String,
        default:"completed"
    }

},{
    timestamps:true
});

module.exports=mongoose.model(
    "Transaction",
    transactionSchema
);
