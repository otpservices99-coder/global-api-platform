const express = require("express");

const router = express.Router();


const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");


const Event = require("../models/Event");
const Rule = require("../models/Rule");
const Action = require("../models/Action");
const Withdrawal = require("../models/Withdrawal");



router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const projectId = req.project._id;



const [
events,
rules,
actions,
withdrawals
] = await Promise.all([



Event.find({
project:projectId
})
.sort({
createdAt:-1
})
.limit(10),



Rule.find({
project:projectId
})
.sort({
createdAt:-1
})
.limit(10),



Action.find({
project:projectId
})
.sort({
createdAt:-1
})
.limit(10),



Withdrawal.find({
project:projectId
})
.sort({
createdAt:-1
})
.limit(10)



]);



res.json({

success:true,

project:projectId,

data:{


events,

rules,

actions,

withdrawals


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
