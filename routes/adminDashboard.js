const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
    getAdminDashboard
} = require("../controllers/adminDashboardController");



/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Admin overview statistics
 */


/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Project API key
 *     responses:
 *       200:
 *         description: Dashboard data returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 */



router.get(
    "/",
    protect,
    admin,
    getAdminDashboard
);



module.exports = router;
