const SponsoredTask = require("../models/SponsoredTask");
const SponsoredTaskSubmission = require("../models/SponsoredTaskSubmission");
const service = require("../services/sponsoredTaskService");
const fileUploadService = require("../services/fileUploadService");

// ============================================================
// USER: AVAILABLE TASKS
// ============================================================

const getTasks = async (req, res) => {
    try {
        const projectId = service.getProjectId(req);
        const userId = service.getUserId(req);

        if (!projectId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Project and user are required"
            });
        }

        const data = await service.getAvailableTasks({
            projectId,
            userId
        });

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK LIST ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// USER: TASK DETAILS
// ============================================================

const getTask = async (req, res) => {
    try {
        const task = await SponsoredTask.findOne({
            _id: req.params.id,
            project: service.getProjectId(req),
            active: true
        }).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Sponsored task not found"
            });
        }

        return res.json({
            success: true,
            data: task
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// USER: SUBMIT PROOF
//
// Supports:
//
// 1. multipart/form-data
//    proof
//    file
//    image
//    proofFile
//
// 2. application/json
//    proofUrl
//    proofImageUrl
//    imageUrl
//
// File upload takes priority over manually supplied URL.
//
// Uploaded files are sent to Cloudinary through the global
// fileUploadService.
// ============================================================

const submitTask = async (req, res) => {
    let uploadedAsset = null;

    try {
        // --------------------------------------------------------
        // DIRECT URL SUBMISSION
        // --------------------------------------------------------

        const directProofUrl =
            req.body?.proofUrl ||
            req.body?.proofImageUrl ||
            req.body?.imageUrl ||
            "";

        let proofUrl =
            String(directProofUrl || "").trim();

        let proofMetadata = {};

        // --------------------------------------------------------
        // CLOUDINARY FILE UPLOAD
        // --------------------------------------------------------

        if (req.file) {
            uploadedAsset =
                await fileUploadService.uploadFile(
                    req.file,
                    {
                        folder:
                            "earnify/sponsored-tasks/proofs",

                        resourceType: "auto"
                    }
                );

            proofUrl =
                uploadedAsset.secureUrl ||
                uploadedAsset.url ||
                "";

            proofMetadata = {
                source: "cloudinary",

                cloudinaryPublicId:
                    uploadedAsset.publicId || "",

                resourceType:
                    uploadedAsset.resourceType || "",

                format:
                    uploadedAsset.format || "",

                mimeType:
                    req.file.mimetype || "",

                bytes:
                    uploadedAsset.bytes ||
                    req.file.size ||
                    0,

                originalFilename:
                    uploadedAsset.originalFilename ||
                    req.file.originalname ||
                    ""
            };
        }

        // --------------------------------------------------------
        // VALIDATE PROOF
        // --------------------------------------------------------

        if (!proofUrl) {
            return res.status(400).json({
                success: false,
                message:
                    "Proof file or proof URL is required"
            });
        }

        // --------------------------------------------------------
        // CREATE SUBMISSION
        // --------------------------------------------------------

        const submission =
            await service.submitTask({
                projectId:
                    service.getProjectId(req),

                userId:
                    service.getUserId(req),

                taskId:
                    req.params.id,

                proofUrl,

                proofType:
                    req.body?.proofType ||
                    (req.file ? "image" : "url"),

                proofMetadata,

                req
            });

        // --------------------------------------------------------
        // SUCCESS
        // --------------------------------------------------------

        return res.status(201).json({
            success: true,

            message:
                "Task proof submitted for review",

            data: submission
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK SUBMIT ERROR:",
            error
        );

        // --------------------------------------------------------
        // CLOUDINARY CLEANUP
        //
        // If Cloudinary upload succeeded but MongoDB submission
        // failed, remove the orphaned Cloudinary asset.
        // --------------------------------------------------------

        if (
            uploadedAsset &&
            uploadedAsset.publicId
        ) {
            try {
                await fileUploadService.deleteFile(
                    uploadedAsset.publicId,
                    uploadedAsset.resourceType ||
                        "image"
                );
            } catch (cleanupError) {
                console.error(
                    "CLOUDINARY CLEANUP ERROR:",
                    cleanupError.message
                );
            }
        }

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// USER: HISTORY
// ============================================================

const getHistory = async (req, res) => {
    try {
        const data =
            await service.getUserHistory({
                projectId:
                    service.getProjectId(req),

                userId:
                    service.getUserId(req)
            });

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK HISTORY ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: CREATE TASK
// ============================================================

const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            imageUrl = "",
            targetUrl,
            platform = "other",
            rewardAmount,
            currency = "NGN",
            needsProof = true,
            verificationMode = "manual",
            maxCompletions = null,
            startsAt = null,
            endsAt = null,
            metadata = {}
        } = req.body;

        if (
            !title ||
            !description ||
            !targetUrl
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "title, description and targetUrl are required"
            });
        }

        const reward =
            Number(rewardAmount);

        if (
            !Number.isFinite(reward) ||
            reward <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "rewardAmount must be greater than zero"
            });
        }

        const task =
            await SponsoredTask.create({
                project:
                    req.project._id,

                title,
                description,
                imageUrl,
                targetUrl,
                platform,

                rewardAmount:
                    reward,

                currency,
                needsProof,
                verificationMode,
                maxCompletions,
                startsAt,
                endsAt,
                metadata,

                createdBy:
                    req.user?._id ||
                    req.user?.id
            });

        return res.status(201).json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK CREATE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: LIST TASKS
// ============================================================

const adminListTasks = async (req, res) => {
    try {
        const tasks =
            await SponsoredTask.find({
                project:
                    req.project._id
            })
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.json({
            success: true,
            data: tasks
        });

    } catch (error) {
        console.error(
            "ADMIN SPONSORED TASK LIST ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: UPDATE TASK
// ============================================================

const updateTask = async (req, res) => {
    try {
        const allowed = [
            "title",
            "description",
            "imageUrl",
            "targetUrl",
            "platform",
            "rewardAmount",
            "currency",
            "needsProof",
            "verificationMode",
            "maxCompletions",
            "active",
            "startsAt",
            "endsAt",
            "metadata"
        ];

        const updates = {};

        for (const key of allowed) {
            if (
                req.body[key] !==
                undefined
            ) {
                updates[key] =
                    req.body[key];
            }
        }

        if (
            updates.rewardAmount !==
            undefined
        ) {
            updates.rewardAmount =
                Number(
                    updates.rewardAmount
                );

            if (
                !Number.isFinite(
                    updates.rewardAmount
                ) ||
                updates.rewardAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "rewardAmount must be greater than zero"
                });
            }
        }

        const task =
            await SponsoredTask.findOneAndUpdate(
                {
                    _id: req.params.id,
                    project:
                        req.project._id
                },
                {
                    $set: updates
                },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!task) {
            return res.status(404).json({
                success: false,
                message:
                    "Sponsored task not found"
            });
        }

        return res.json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK UPDATE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: SUBMISSIONS
// ============================================================

const adminSubmissions = async (req, res) => {
    try {
        const query = {
            project:
                req.project._id
        };

        if (req.query.status) {
            query.status =
                req.query.status;
        }

        if (req.query.taskId) {
            query.task =
                req.query.taskId;
        }

        const submissions =
            await SponsoredTaskSubmission.find(
                query
            )
                .populate(
                    "task",
                    "title description rewardAmount currency targetUrl platform"
                )
                .populate(
                    "user",
                    "username email deviceId"
                )
                .populate(
                    "reviewedBy",
                    "username email"
                )
                .sort({
                    createdAt: -1
                });

        return res.json({
            success: true,
            data: submissions
        });

    } catch (error) {
        console.error(
            "ADMIN SPONSORED TASK SUBMISSIONS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: APPROVE
// ============================================================

const approveSubmission = async (req, res) => {
    try {
        const result =
            await service.approveSubmission({
                projectId:
                    req.project._id,

                submissionId:
                    req.params.id,

                adminUserId:
                    req.user?._id ||
                    req.user?.id,

                reviewNote:
                    req.body?.reviewNote ||
                    ""
            });

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK APPROVE ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// ADMIN: REJECT
// ============================================================

const rejectSubmission = async (req, res) => {
    try {
        const reason =
            req.body?.reason ||
            req.body?.rejectionReason;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message:
                    "Rejection reason is required"
            });
        }

        const submission =
            await service.rejectSubmission({
                projectId:
                    req.project._id,

                submissionId:
                    req.params.id,

                adminUserId:
                    req.user?._id ||
                    req.user?.id,

                reason
            });

        return res.json({
            success: true,
            data: submission
        });

    } catch (error) {
        console.error(
            "SPONSORED TASK REJECT ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getTasks,
    getTask,
    submitTask,
    getHistory,

    createTask,
    adminListTasks,
    updateTask,
    adminSubmissions,
    approveSubmission,
    rejectSubmission
};
