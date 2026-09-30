const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const project = require("../middleware/project");

const {
    getTasks,
    getTask,
    submitTask,
    getHistory
} = require("../controllers/sponsoredTaskController");

/**
 * @swagger
 * tags:
 *   - name: Sponsored Tasks
 *     description: User-facing sponsored task and proof submission APIs
 */

/**
 * @swagger
 * /api/v1/sponsored-tasks:
 *   get:
 *     summary: Get available sponsored tasks
 *     description: Returns active sponsored tasks available to the authenticated user for the current project.
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sponsored tasks returned successfully
 *       400:
 *         description: Project and user are required
 *       401:
 *         description: Authentication required
 */
router.get(
    "/",
    protect,
    project,
    getTasks
);

/**
 * @swagger
 * /api/v1/sponsored-tasks/history:
 *   get:
 *     summary: Get sponsored task submission history
 *     description: Returns the authenticated user's sponsored task submission history.
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Submission history returned successfully
 *       401:
 *         description: Authentication required
 */
router.get(
    "/history",
    protect,
    project,
    getHistory
);

/**
 * @swagger
 * /api/v1/sponsored-tasks/{id}:
 *   get:
 *     summary: Get sponsored task details
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sponsored task ID
 *     responses:
 *       200:
 *         description: Sponsored task returned successfully
 *       404:
 *         description: Sponsored task not found
 *       401:
 *         description: Authentication required
 */
router.get(
    "/:id",
    protect,
    project,
    getTask
);

/**
 * @swagger
 * /api/v1/sponsored-tasks/{id}/submit:
 *   post:
 *     summary: Submit proof for a sponsored task
 *     description: Submits proof for admin review. The backend records the submission, attempt number, fraud information and proof metadata.
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sponsored task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proofUrl
 *             properties:
 *               proofUrl:
 *                 type: string
 *                 description: URL of the submitted proof image/file
 *                 example: https://example.com/proof.png
 *               proofImageUrl:
 *                 type: string
 *                 description: Alternative accepted proof URL field
 *               imageUrl:
 *                 type: string
 *                 description: Alternative accepted proof URL field
 *               proofType:
 *                 type: string
 *                 enum: [image, url, text, other]
 *                 default: image
 *                 example: image
 *     responses:
 *       201:
 *         description: Proof submitted for admin review
 *       400:
 *         description: Proof URL is required
 *       401:
 *         description: Authentication required
 */
router.post(
    "/:id/submit",
    protect,
    project,
    submitTask
);

module.exports = router;
