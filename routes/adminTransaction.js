const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");

const {
    getTransactions
} = require("../controllers/adminTransactionController");


router.get(
    "/",
    project,
    protect,
    admin,
    getTransactions
);


module.exports = router;
