const express = require("express");

const router = express.Router();


const protect =
require("../middleware/auth");

const admin =
require("../middleware/admin");


const {
createProject
}=require("../controllers/projectManagerController");



router.post(
"/",
protect,
admin,
createProject
);



module.exports = router;
