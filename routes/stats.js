const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
    getStats
} = require("../controllers/statsController");


/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Platform statistics APIs
 */


/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Statistics]
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
 *         description: Statistics returned successfully
 */
router.get(
    "/",
    protect,
    admin,
    getStats
);


module.exports = router;
