const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const {
    getWallet,
    getTransactions
} = require("../controllers/walletController");


/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet read APIs
 */


/**
 * @swagger
 * /api/v1/wallet:
 *   get:
 *     summary: Get current user's wallet
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet returned
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/",
    protect,
    getWallet
);


/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get current user's wallet transactions
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions returned
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/transactions",
    protect,
    getTransactions
);


module.exports = router;
