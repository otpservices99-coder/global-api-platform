const express = require("express");

const router = express.Router();


const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");


const {

    getWithdrawals,
    approveWithdrawal,
    rejectWithdrawal

} = require("../controllers/adminWithdrawalController");



router.get(
    "/",
    protect,
    admin,
    getWithdrawals
);



router.post(
    "/:id/approve",
    protect,
    admin,
    validateObjectId("id"),
    approveWithdrawal
);



router.post(
    "/:id/reject",
    protect,
    admin,
    validateObjectId("id"),
    rejectWithdrawal
);



module.exports = router;
