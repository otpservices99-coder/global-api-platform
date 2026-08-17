const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const {
    loginLimiter
} = require("../middleware/rateLimiter");

const project = require("../middleware/project");


/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication APIs
 */


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Project or global API key
 *       - in: header
 *         name: X-Project-ID
 *         required: false
 *         schema:
 *           type: string
 *         description: Required when using a global API key to target a project
 */


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: X-API-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Project or global API key
 *       - in: header
 *         name: X-Project-ID
 *         required: false
 *         schema:
 *           type: string
 *         description: Required when using a global API key to target a project
 */


/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post(
    "/register",
    project,
    registerUser
);


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post(
    "/login",
    project,
    loginLimiter,
    loginUser
);


module.exports = router;
