const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const {
    searchUsers
} = require("../controllers/searchController");



/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search APIs
 */



/**
 * @swagger
 * /api/v1/search/users:
 *   get:
 *     summary: Search users
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Username or email search query
 *     responses:
 *       200:
 *         description: Users found
 */


router.get(
    "/users",
    protect,
    admin,
    searchUsers
);



module.exports = router;
