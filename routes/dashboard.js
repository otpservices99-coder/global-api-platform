const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
    adminDashboard
}=require("../controllers/dashboardController");



router.get(
    "/",
    protect,
    admin,
    adminDashboard
);



module.exports=router;
