const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/auth");

const admin =
    require("../middleware/admin");

const project =
    require("../middleware/project");

const upload =
    require("../middleware/upload");

const {
    createTask,
    adminListTasks,
    updateTask,
    adminSubmissions,
    approveSubmission,
    rejectSubmission
} =
    require("../controllers/sponsoredTaskController");


// ============================================================
// ADMIN SPONSORED TASKS
// ============================================================

/**
 * @swagger
 * tags:
 *   - name: Admin Sponsored Tasks
 *     description: Admin campaign management and sponsored task review APIs
 */


// ============================================================
// LIST TASKS
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks:
 *   get:
 *     summary: List sponsored tasks
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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


// ============================================================
// CREATE SPONSORED TASK
//
// Supports:
//
// A) application/json
//
// B) multipart/form-data
//
// Multipart image field:
//   image
//
// Alternative accepted fields:
//   banner
//   taskImage
//
// JSON imageUrl remains supported.
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks:
 *   post:
 *     summary: Create sponsored task
 *     description: >
 *       Creates a sponsored task. Supports both JSON and multipart/form-data.
 *       For multipart requests, upload the campaign banner using the `image`
 *       field. The image is processed through Multer and the existing
 *       Cloudinary upload pipeline, then the resulting secure URL is stored
 *       as `imageUrl`. The alternative file fields `banner` and `taskImage`
 *       are also accepted.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *                 example: Telegram Campaign
 *               description:
 *                 type: string
 *                 example: Join our Telegram channel and submit proof
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Existing campaign image URL when not uploading a file
 *                 example: https://res.cloudinary.com/example/image/upload/banner.png
 *               targetUrl:
 *                 type: string
 *                 format: uri
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
 *                 enum:
 *                   - manual
 *                   - link_visit
 *                   - platform_api
 *                   - hybrid
 *                 default: manual
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
 *                 example: 100
 *               active:
 *                 type: boolean
 *                 default: true
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
 *         multipart/form-data:
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
 *                 example: Telegram Campaign
 *               description:
 *                 type: string
 *                 example: Join our Telegram channel and submit proof
 *               targetUrl:
 *                 type: string
 *                 example: https://t.me/example
 *               rewardAmount:
 *                 type: number
 *                 example: 100
 *               currency:
 *                 type: string
 *                 example: NGN
 *               platform:
 *                 type: string
 *                 example: telegram
 *               needsProof:
 *                 type: boolean
 *                 example: true
 *               verificationMode:
 *                 type: string
 *                 enum:
 *                   - manual
 *                   - link_visit
 *                   - platform_api
 *                   - hybrid
 *                 example: manual
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
 *               active:
 *                 type: boolean
 *                 example: true
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Campaign banner image. JPEG, PNG, WebP or GIF. Maximum 5MB.
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Alternative campaign banner file field.
 *               taskImage:
 *                 type: string
 *                 format: binary
 *                 description: Alternative campaign image file field.
 *               imageUrl:
 *                 type: string
 *                 description: Existing image URL if no file is uploaded.
 *     responses:
 *       201:
 *         description: Sponsored task created successfully
 *       400:
 *         description: Invalid task data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server or Cloudinary upload error
 */

router.post(
    "/",
    protect,
    project,
    admin,

    upload.fields([
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "banner",
            maxCount: 1
        },
        {
            name: "taskImage",
            maxCount: 1
        }
    ]),

    (req, res, next) => {
        try {
            const fields =
                req.files || {};

            const file =
                fields.image?.[0] ||
                fields.banner?.[0] ||
                fields.taskImage?.[0] ||
                null;

            req.file = file;

            return next();

        } catch (error) {
            return next(error);
        }
    },

    upload.single("image"),
    createTask
);


// ============================================================
// UPDATE SPONSORED TASK
//
// Supports:
//
// A) application/json
//
// B) multipart/form-data
//
// image is optional.
//
// imageUrl: "" can be used to clear an existing image.
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/{id}:
 *   patch:
 *     summary: Update sponsored task
 *     description: >
 *       Updates a sponsored task. Supports both JSON and multipart/form-data.
 *       Upload a replacement campaign banner using the `image` field.
 *       The uploaded image is sent through the existing Multer and Cloudinary
 *       pipeline and the resulting secure URL replaces `imageUrl`.
 *       Set `imageUrl` to an empty string to clear the existing image.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *                 description: Existing image URL, or empty string to clear image
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
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
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Replacement campaign banner. JPEG, PNG, WebP or GIF. Maximum 5MB.
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Alternative replacement image field.
 *               taskImage:
 *                 type: string
 *                 format: binary
 *                 description: Alternative replacement image field.
 *               imageUrl:
 *                 type: string
 *                 description: Existing image URL or empty string to clear image.
 *     responses:
 *       200:
 *         description: Sponsored task updated successfully
 *       400:
 *         description: Invalid task data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Sponsored task not found
 *       500:
 *         description: Server or Cloudinary upload error
 */

router.patch(
    "/:id",
    protect,
    project,
    admin,

    upload.fields([
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "banner",
            maxCount: 1
        },
        {
            name: "taskImage",
            maxCount: 1
        }
    ]),

    (req, res, next) => {
        try {
            const fields =
                req.files || {};

            const file =
                fields.image?.[0] ||
                fields.banner?.[0] ||
                fields.taskImage?.[0] ||
                null;

            req.file = file;

            return next();

        } catch (error) {
            return next(error);
        }
    },

    upload.single("image"),
    updateTask
);


// ============================================================
// LIST SUBMISSIONS
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/list:
 *   get:
 *     summary: List sponsored task submissions
 *     description: Returns sponsored task submissions including user, task, review and fraud information.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - pending
 *             - approved
 *             - rejected
 *             - clawed_back
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


// ============================================================
// APPROVE SUBMISSION
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/{id}/approve:
 *   post:
 *     summary: Approve sponsored task submission
 *     description: Approves a submission and invokes the sponsored task approval workflow, including reward processing.
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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


// ============================================================
// REJECT SUBMISSION
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/submissions/{id}/reject:
 *   post:
 *     summary: Reject sponsored task submission
 *     tags: [Admin Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
