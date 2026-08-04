const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
list
}=require("../handlers");



router.get(
"/",
protect,
admin,
(req,res)=>{


res.json({

success:true,

actions:list()

});


});


module.exports = router;
