const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const {
    getWallet,
    creditWallet,
    debitWallet,
    getTransactions
} = require("../controllers/walletController");


/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet APIs
 */


/**
 * @swagger
 * /api/v1/wallet:
 *   get:
 *     summary: Get wallet
 *     tags: [Wallet]
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
 */

router.get(
    "/",
    protect,
    getWallet
);



/**
 * @swagger
 * /api/v1/wallet/credit:
 *   post:
 *     summary: Credit wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet credited
 */

router.post(
    "/credit",
    protect,
    creditWallet
);



/**
 * @swagger
 * /api/v1/wallet/debit:
 *   post:
 *     summary: Debit wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet debited
 */

router.post(
    "/debit",
    protect,
    debitWallet
);



/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Wallet]
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
 */

router.get(
    "/transactions",
    protect,
    getTransactions
);


module.exports = router;
