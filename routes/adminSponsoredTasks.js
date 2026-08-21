const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");

const {
    createTask,
    adminListTasks,
    updateTask,
    adminSubmissions,
    approveSubmission,
    rejectSubmission
} = require("../controllers/sponsoredTaskController");

/**
 * @swagger
 * tags:
 *   - name: Admin Sponsored Tasks
 *     description: Admin campaign management and sponsored task review APIs
 */

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks:
 *   get:
 *     summary: List sponsored tasks
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Sponsored tasks returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get(
    "/",
    protect,
    project,
    admin,
    adminListTasks
);

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks:
 *   post:
 *     summary: Create sponsored task
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - targetUrl
 *               - rewardAmount
 *             properties:
 *               title:
 *                 type: string
 *                 example: Telegram Notification Test
 *               description:
 *                 type: string
 *                 example: Join the Telegram channel and submit a screenshot.
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/task.png
 *               targetUrl:
 *                 type: string
 *                 example: https://t.me/example
 *               platform:
 *                 type: string
 *                 example: telegram
 *               rewardAmount:
 *                 type: number
 *                 example: 100
 *               currency:
 *                 type: string
 *                 default: NGN
 *                 example: NGN
 *               needsProof:
 *                 type: boolean
 *                 default: true
 *               verificationMode:
 *                 type: string
 *                 enum: [manual, link_visit, platform_api, hybrid]
 *                 default: manual
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
 *                 example: 100
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Sponsored task created
 *       400:
 *         description: Invalid task data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
    "/",
    protect,
    project,
    admin,
    createTask
);

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/{id}:
 *   patch:
 *     summary: Update sponsored task
 *     tags: [Admin Sponsored Tasks]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               targetUrl:
 *                 type: string
 *               platform:
 *                 type: string
 *               rewardAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *               needsProof:
 *                 type: boolean
 *               verificationMode:
 *                 type: string
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
 *               active:
 *                 type: boolean
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Sponsored task updated
 *       404:
 *         description: Sponsored task not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.patch(
    "/:id",
    protect,
    project,
    admin,
    updateTask
);

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/list:
 *   get:
 *     summary: List sponsored task submissions
 *     description: Returns sponsored task submissions including user, task, review and fraud information.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, clawed_back]
 *         description: Filter submissions by status
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: Filter submissions by sponsored task ID
 *     responses:
 *       200:
 *         description: Sponsored task submissions returned
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get(
    "/submissions/list",
    protect,
    project,
    admin,
    adminSubmissions
);

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/{id}/approve:
 *   post:
 *     summary: Approve sponsored task submission
 *     description: Approves a submission and invokes the sponsored task approval workflow, including reward processing.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sponsored task submission ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNote:
 *                 type: string
 *                 example: Proof verified successfully.
 *     responses:
 *       200:
 *         description: Submission approved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Submission not found
 */
router.post(
    "/submissions/:id/approve",
    protect,
    project,
    admin,
    approveSubmission
);

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/{id}/reject:
 *   post:
 *     summary: Reject sponsored task submission
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sponsored task submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Submitted proof does not match the task requirements.
 *               rejectionReason:
 *                 type: string
 *                 description: Alternative accepted rejection reason field
 *     responses:
 *       200:
 *         description: Submission rejected
 *       400:
 *         description: Rejection reason is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Submission not found
 */
router.post(
    "/submissions/:id/reject",
    protect,
    project,
    admin,
    rejectSubmission
);

module.exports = router;
