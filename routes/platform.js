const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
    getAllProjects,
    getProject,
    disableProject,
    enableProject,
    updateProject,
    rotateApiKey
} = require("../controllers/platformController");


/**
 * @swagger
 * tags:
 *   name: Platform
 *   description: Global platform management APIs
 */


/**
 * @swagger
 * /api/v1/platform/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Platform]
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
 *         description: Projects returned
 */

router.get(
    "/projects",
    protect,
    admin,
    getAllProjects
);


/**
 * @swagger
 * /api/v1/platform/projects/{id}:
 *   get:
 *     summary: Get single project
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

router.get(
    "/projects/:id",
    protect,
    admin,
    getProject
);


/**
 * @swagger
 * /api/v1/platform/projects/{id}/disable:
 *   patch:
 *     summary: Disable project
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

router.patch(
    "/projects/:id/disable",
    protect,
    admin,
    disableProject
);


/**
 * @swagger
 * /api/v1/platform/projects/{id}/enable:
 *   patch:
 *     summary: Enable project
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

router.patch(
    "/projects/:id/enable",
    protect,
    admin,
    enableProject
);


/**
 * @swagger
 * /api/v1/platform/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

router.put(
    "/projects/:id",
    protect,
    admin,
    updateProject
);


/**
 * @swagger
 * /api/v1/platform/projects/{id}/rotate-key:
 *   post:
 *     summary: Rotate project API key
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

router.post(
    "/projects/:id/rotate-key",
    protect,
    admin,
    rotateApiKey
);


module.exports = router;
