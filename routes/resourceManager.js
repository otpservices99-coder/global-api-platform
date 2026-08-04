const express = require("express");

const router = express.Router();


const project =
require("../middleware/project");


const controller =
require("../controllers/resourceManagerController");



// Every request requires project API key

router.use(project);



// Create a resource definition

router.post(
"/",
controller.create
);



// List project resources

router.get(
"/",
controller.list
);



module.exports = router;
