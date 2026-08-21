const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");
const upload = require("../middleware/upload");

const fileUploadService =
    require("../services/fileUploadService");

const {
    createTask,
    adminListTasks,
    updateTask,
    adminSubmissions,
    approveSubmission,
    rejectSubmission
} = require("../controllers/sponsoredTaskController");


// ============================================================
// ADMIN SPONSORED TASK IMAGE UPLOAD
//
// Primary field:
//   image=<file>
//
// Aliases also accepted:
//   banner=<file>
//   taskImage=<file>
//
// Flow:
//   Multer -> Cloudinary -> req.body.imageUrl
//
// This allows the existing createTask/updateTask controllers
// to continue using imageUrl exactly as before.
// ============================================================

const adminTaskImageUpload = [
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

    async (req, res, next) => {
        try {
            // Multer populates req.body for multipart/form-data.
            // Make absolutely sure it exists before the controller.
            req.body = req.body || {};

            const fields = req.files || {};

            const file =
                fields.image?.[0] ||
                fields.banner?.[0] ||
                fields.taskImage?.[0] ||
                null;

            req.file = file;

            // No file:
            // Keep normal JSON/imageUrl behavior untouched.
            if (!file) {
                return next();
            }

            // ----------------------------------------------------
            // IMAGE VALIDATION
            // ----------------------------------------------------

            const allowedMimeTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (!allowedMimeTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only JPEG, PNG, WebP, and GIF images are allowed"
                });
            }

            // 5 MB maximum campaign banner.
            if (Number(file.size || 0) > 5 * 1024 * 1024) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Campaign image must not exceed 5MB"
                });
            }

            // ----------------------------------------------------
            // CLOUDINARY
            // Reuse the same global upload service used by
            // sponsored-task proof uploads.
            // ----------------------------------------------------

            const uploadedAsset =
                await fileUploadService.uploadFile(
                    file,
                    {
                        folder:
                            "earnify/sponsored-tasks/banners",

                        resourceType: "image"
                    }
                );

            const secureUrl =
                uploadedAsset?.secureUrl ||
                uploadedAsset?.url ||
                "";

            if (!secureUrl) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Cloudinary upload completed without a secure URL"
                });
            }

            // ----------------------------------------------------
            // IMPORTANT
            //
            // Existing createTask/updateTask already understand
            // imageUrl. We simply inject the Cloudinary URL into
            // the same field.
            // ----------------------------------------------------

            req.body.imageUrl = secureUrl;

            // Keep upload metadata available if needed later.
            req.uploadedTaskImage = uploadedAsset;

            return next();

        } catch (error) {
            console.error(
                "ADMIN SPONSORED TASK IMAGE UPLOAD ERROR:",
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message ||
                    "Campaign image upload failed"
            });
        }
    }
];


// ============================================================
// GET ADMIN SPONSORED TASKS
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
// CREATE ADMIN SPONSORED TASK
//
// Supports:
//
// 1. application/json
//    imageUrl=https://...
//
// 2. multipart/form-data
//    image=<file>
//
// Aliases:
//    banner=<file>
//    taskImage=<file>
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks:
 *   post:
 *     summary: Create sponsored task
 *     description: >
 *       Creates a sponsored task. Supports both JSON imageUrl and
 *       multipart campaign image upload. Multipart images are uploaded
 *       to Cloudinary and the resulting secure URL is stored as imageUrl.
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
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               targetUrl:
 *                 type: string
 *                 format: uri
 *               platform:
 *                 type: string
 *               rewardAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: NGN
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
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
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
 *
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
 *               description:
 *                 type: string
 *               targetUrl:
 *                 type: string
 *               rewardAmount:
 *                 type: number
 *               platform:
 *                 type: string
 *               currency:
 *                 type: string
 *                 default: NGN
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
 *               maxCompletions:
 *                 type: integer
 *                 nullable: true
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: string
 *                 description: JSON object encoded as a string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Campaign banner image. JPEG, PNG, WebP, or GIF. Maximum 5MB.
 *
 *     responses:
 *       201:
 *         description: Sponsored task created successfully
 *       400:
 *         description: Invalid task data or campaign image
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
    ...adminTaskImageUpload,
    createTask
);


// ============================================================
// UPDATE ADMIN SPONSORED TASK
//
// Supports:
//
// JSON:
//   imageUrl=https://...
//
// Multipart:
//   image=<file>
//
// Aliases:
//   banner=<file>
//   taskImage=<file>
//
// imageUrl="" can be used to clear an image when no file
// is supplied.
// ============================================================

/**
 * @swagger
 * /api/v1/admin/sponsored-tasks/{id}:
 *   patch:
 *     summary: Update sponsored task
 *     description: >
 *       Updates a sponsored task. Supports normal JSON updates and
 *       optional multipart campaign image upload. A new uploaded image
 *       replaces imageUrl with its Cloudinary secure URL.
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
 *                 description: Existing image URL. Send an empty string to clear it.
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
 *
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New campaign banner image. JPEG, PNG, WebP, or GIF. Maximum 5MB.
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
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 description: Send empty string to clear the existing image when no file is uploaded.
 *
 *     responses:
 *       200:
 *         description: Sponsored task updated successfully
 *       400:
 *         description: Invalid task data or campaign image
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Sponsored task not found
 */

router.patch(
    "/:id",
    protect,
    project,
    admin,
    ...adminTaskImageUpload,
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
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNote:
 *                 type: string
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
 *               rejectionReason:
 *                 type: string
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
