const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
    getUsers,
    getUserDetails,
    updateStatus,
    updateRole
} = require("../controllers/adminUserController");


/**
 * @swagger
 * tags:
 *   name: Admin Users
 *   description: User management APIs
 */


/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin Users]
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
 *         description: Users returned
 */

router.get(
    "/",
    protect,
    admin,
    getUsers
);


/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details returned
 */

router.get(
    "/:id",
    protect,
    admin,
    getUserDetails
);


/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               status:
 *                 type: string
 *                 example: active
 *     responses:
 *       200:
 *         description: User status updated
 */

router.patch(
    "/:id/status",
    protect,
    admin,
    updateStatus
);


/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: User role updated
 */

router.patch(
    "/:id/role",
    protect,
    admin,
    updateRole
);


module.exports = router;
