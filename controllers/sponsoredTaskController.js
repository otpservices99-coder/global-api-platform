const SponsoredTask =
    require("../models/SponsoredTask");

const SponsoredTaskSubmission =
    require("../models/SponsoredTaskSubmission");

const service =
    require("../services/sponsoredTaskService");


// ============================================================
// USER: AVAILABLE TASKS
// ============================================================

const getTasks =
    async (req, res) => {
        try {
            const projectId =
                service.getProjectId(req);

            const userId =
                service.getUserId(req);

            if (!projectId || !userId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Project and user are required"
                });
            }

            const data =
                await service.getAvailableTasks({
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
                message:
                    error.message
            });
        }
    };


// ============================================================
// USER: TASK DETAILS
// ============================================================

const getTask =
    async (req, res) => {
        try {
            const task =
                await SponsoredTask.findOne({
                    _id: req.params.id,
                    project:
                        service.getProjectId(req),
                    active: true
                }).lean();

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
            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// USER: SUBMIT PROOF
// ============================================================

const submitTask =
    async (req, res) => {
        try {
            const proofUrl =
                req.body?.proofUrl ||
                req.body?.proofImageUrl ||
                req.body?.imageUrl;

            if (!proofUrl) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Proof URL is required"
                });
            }

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
                        "image",

                    req
                });

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

            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// USER: HISTORY
// ============================================================

const getHistory =
    async (req, res) => {
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
            return res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: CREATE
// ============================================================

const createTask =
    async (req, res) => {
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
            return res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: LIST TASKS
// ============================================================

const adminListTasks =
    async (req, res) => {
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
            return res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: UPDATE
// ============================================================

const updateTask =
    async (req, res) => {
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
            return res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: SUBMISSIONS
// ============================================================

const adminSubmissions =
    async (req, res) => {
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
            return res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: APPROVE
// ============================================================

const approveSubmission =
    async (req, res) => {
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
                message:
                    error.message
            });
        }
    };


// ============================================================
// ADMIN: REJECT
// ============================================================

const rejectSubmission =
    async (req, res) => {
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
            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message
            });
        }
    };


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
