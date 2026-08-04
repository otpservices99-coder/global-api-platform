const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({

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

    balance:{
        type:Number,
        default:0
    },

    pendingBalance:{
        type:Number,
        default:0
    },

    totalEarned:{
        type:Number,
        default:0
    },

    totalWithdrawn:{
        type:Number,
        default:0
    },

    currency:{
        type:String,
        default:"NGN"
    }

},{
    timestamps:true
});

module.exports=mongoose.model("Wallet",walletSchema);
