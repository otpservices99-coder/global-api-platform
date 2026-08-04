const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");


const {

    creditUserWallet,
    debitUserWallet,
    getUserTransactions

} = require("../controllers/adminWalletController");



/**
 * Admin credit wallet
 */
router.post(
    "/:userId/credit",
    protect,
    admin,
    validateObjectId("userId"),
    creditUserWallet
);



/**
 * Admin debit wallet
 */
router.post(
    "/:userId/debit",
    protect,
    admin,
    validateObjectId("userId"),
    debitUserWallet
);



/**
 * Get user transactions
 */
router.get(
    "/:userId/transactions",
    protect,
    admin,
    validateObjectId("userId"),
    getUserTransactions
);



module.exports = router;
