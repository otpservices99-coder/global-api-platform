const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const {
    getSettings,
    updateSettings
} = require("../controllers/settingsController");



/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Project settings APIs
 */



/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Get project settings
 *     tags: [Settings]
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
 *         description: Settings returned
 */

router.get(
    "/",
    protect,
    getSettings
);






/**
 * @swagger
 * /api/v1/settings:
 *   put:
 *     summary: Update project settings
 *     tags: [Settings]
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
 *               currency:
 *                 type: string
 *               minimumWithdrawal:
 *                 type: number
 *               referralBonus:
 *                 type: number
 *               dailyBonus:
 *                 type: number
 *               rewardedVideoReward:
 *                 type: number
 *               siteName:
 *                 type: string
 *               logo:
 *                 type: string
 *               maintenance:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated
 */

router.put(
    "/",
    protect,
    admin,
    updateSettings
);



module.exports = router;
