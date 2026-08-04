const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const {
    getLogs
} = require("../controllers/auditController");



/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log APIs
 */



/**
 * @swagger
 * /api/v1/admin/audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
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
 *         description: Audit logs returned
 */


router.get(
    "/",
    protect,
    admin,
    getLogs
);



module.exports = router;
