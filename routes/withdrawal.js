const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const {
    requestWithdrawal
} = require("../controllers/withdrawalController");


/**
 * @swagger
 * tags:
 *   name: Withdrawals
 *   description: User withdrawal APIs
 */


/**
 * @swagger
 * /api/v1/withdrawals/request:
 *   post:
 *     summary: Request withdrawal
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *               - details
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50
 *               method:
 *                 type: string
 *                 example: bank
 *               details:
 *                 type: object
 *                 example:
 *                   bank: Example Bank
 *                   accountNumber: "1234567890"
 *                   accountName: Test User
 *     responses:
 *       200:
 *         description: Withdrawal request submitted
 */
router.post(
    "/request",
    protect,
    requestWithdrawal
);


module.exports = router;
