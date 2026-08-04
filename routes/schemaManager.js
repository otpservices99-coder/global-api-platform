const express=require("express");

const router=express.Router();


const project =
require("../middleware/project");


const controller =
require("../controllers/schemaManagerController");



router.use(project);



router.post(
"/",
controller.create
);



router.get(
"/",
controller.list
);



module.exports=router;
