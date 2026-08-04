const express=require("express");

const router=express.Router();


const controller=require("../controllers/resourceController");



router.post("/:resource",controller.create);


router.get("/:resource",controller.find);


router.get("/:resource/:id",controller.findOne);


router.patch("/:resource/:id",controller.update);


router.delete("/:resource/:id",controller.remove);



module.exports=router;
