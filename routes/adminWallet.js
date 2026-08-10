const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");

const {
    getUserWallet,
    creditUserWallet,
    debitUserWallet,
    getUserTransactions
} = require("../controllers/adminWalletController");



/*
 * Get a user's wallet
 *
 * GET /api/v1/admin/wallet/:userId
 */
router.get(
    "/:userId",
    protect,
    admin,
    validateObjectId("userId"),
    getUserWallet
);



/*
 * Credit a user's wallet
 *
 * POST /api/v1/admin/wallet/:userId/credit
 */
router.post(
    "/:userId/credit",
    protect,
    admin,
    validateObjectId("userId"),
    creditUserWallet
);



/*
 * Debit a user's wallet
 *
 * POST /api/v1/admin/wallet/:userId/debit
 */
router.post(
    "/:userId/debit",
    protect,
    admin,
    validateObjectId("userId"),
    debitUserWallet
);



/*
 * Get a user's transactions
 *
 * GET /api/v1/admin/wallet/:userId/transactions
 */
router.get(
    "/:userId/transactions",
    protect,
    admin,
    validateObjectId("userId"),
    getUserTransactions
);



module.exports = router;
