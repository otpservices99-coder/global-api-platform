const express = require("express");

const router = express.Router();

const Role = require("../models/Role");
require("../models/Permission");

const project = require("../middleware/project");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");



router.get(
"/",
project,
protect,
admin,
async(req,res)=>{


try{


const roles = await Role.find({

project:req.project._id

}).populate("permissions");



res.json({

success:true,

data:roles

});


}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}


});


module.exports = router;
