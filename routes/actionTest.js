const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const {
    processAction
} = require("../services/actionEngine");



router.post(
"/wallet-credit",
protect,
async(req,res)=>{


try{


const result = await processAction({

projectId:req.user.project,

action:"wallet.credit",

user:req.user,

actorId:req.user._id,

data:req.body,

req


});


res.json(result);



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}


});


module.exports = router;
