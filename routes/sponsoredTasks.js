const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const project = require("../middleware/project");
const upload = require("../middleware/upload");

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
 *     description: User sponsored-task discovery, proof submission, and history
 */


/**
 * @swagger
 * /api/v1/sponsored-tasks:
 *   get:
 *     summary: Get available sponsored tasks
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Available sponsored tasks
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
 *     summary: Get sponsored-task submission history
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: User sponsored-task history
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
 *     summary: Get a sponsored task
 *     tags: [Sponsored Tasks]
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
 *     responses:
 *       200:
 *         description: Sponsored task details
 *       404:
 *         description: Sponsored task not found
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
 *     description: >
 *       Submit sponsored-task proof for review. The endpoint supports
 *       multipart/form-data file uploads and JSON proof URLs.
 *
 *       For multipart uploads, use the `proof` field for the file.
 *       The backend also accepts `file`, `image`, or `proofFile` as
 *       alternative file field names.
 *
 *       Uploaded files are processed in memory by Multer and uploaded
 *       to Cloudinary by the global file upload service. The resulting
 *       Cloudinary secure URL is stored as `proofUrl` on the submission.
 *
 *       Supported multipart file types are JPEG, PNG, WebP, GIF, HEIC,
 *       HEIF, and PDF. Maximum upload size is controlled by
 *       MAX_UPLOAD_SIZE_MB and defaults to 10 MB.
 *     tags: [Sponsored Tasks]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               proof:
 *                 type: string
 *                 format: binary
 *                 description: Proof file. This is the primary upload field.
 *               proofType:
 *                 type: string
 *                 enum:
 *                   - image
 *                   - url
 *                   - text
 *                   - other
 *                 default: image
 *                 description: Type of proof being submitted.
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Alternative file field accepted by the backend.
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Alternative file field accepted by the backend.
 *               proofFile:
 *                 type: string
 *                 format: binary
 *                 description: Alternative file field accepted by the backend.
 *             required:
 *               - proof
 *
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proofUrl:
 *                 type: string
 *                 format: uri
 *                 description: Existing proof URL. Used when no file is uploaded.
 *               proofImageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Alternative existing proof URL field.
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Alternative existing proof URL field.
 *               proofType:
 *                 type: string
 *                 enum:
 *                   - image
 *                   - url
 *                   - text
 *                   - other
 *                 default: url
 *     responses:
 *       201:
 *         description: Task proof submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task proof submitted for review
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Submission ID
 *                     project:
 *                       type: string
 *                     task:
 *                       type: string
 *                     user:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum:
 *                         - pending
 *                         - approved
 *                         - rejected
 *                         - clawed_back
 *                     proofUrl:
 *                       type: string
 *                       format: uri
 *                       description: Cloudinary secure URL for an uploaded proof file.
 *                       example: https://res.cloudinary.com/example/image/upload/v123/earnify/sponsored-tasks/proofs/example.png
 *                     proofType:
 *                       type: string
 *                     proofHash:
 *                       type: string
 *                     targetUrl:
 *                       type: string
 *                     verificationMode:
 *                       type: string
 *                     rewardAmount:
 *                       type: number
 *                       example: 100
 *                     currency:
 *                       type: string
 *                       example: NGN
 *                     transaction:
 *                       type: string
 *                       nullable: true
 *                     attemptNumber:
 *                       type: integer
 *                     fraudScore:
 *                       type: number
 *                     fraudFlags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     deviceId:
 *                       type: string
 *                     ipHash:
 *                       type: string
 *                     userAgent:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                       additionalProperties: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Proof file or proof URL is required, or invalid submission data
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Project/API access denied
 *       404:
 *         description: Sponsored task not found
 *       500:
 *         description: Server or Cloudinary upload error
 */
router.post(
    "/:id/submit",
    protect,
    project,

    upload.fields([
        {
            name: "proof",
            maxCount: 1
        },
        {
            name: "file",
            maxCount: 1
        },
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "proofFile",
            maxCount: 1
        }
    ]),

    (req, res, next) => {
        try {
            const fields = req.files || {};

            const file =
                fields.proof?.[0] ||
                fields.file?.[0] ||
                fields.image?.[0] ||
                fields.proofFile?.[0] ||
                null;

            req.file = file;

            return next();
        } catch (error) {
            return next(error);
        }
    },

    submitTask
);


module.exports = router;
