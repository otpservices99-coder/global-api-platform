const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");


const User = require("../models/User");
const Event = require("../models/Event");
const Rule = require("../models/Rule");
const Action = require("../models/Action");
const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");



router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const projectId = req.project._id;



const data = await Promise.all([


User.countDocuments({
project:projectId
}),


Event.countDocuments({
project:projectId
}),


Rule.countDocuments({
project:projectId
}),


Action.countDocuments({
project:projectId
}),


Wallet.countDocuments({
project:projectId
}),


Withdrawal.countDocuments({
project:projectId
})


]);



res.json({

success:true,

project:projectId,

data:{

users:data[0],

events:data[1],

rules:data[2],

actions:data[3],

wallets:data[4],

withdrawals:data[5]

}

});


}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});


module.exports = router;
