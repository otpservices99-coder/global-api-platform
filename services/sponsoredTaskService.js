const crypto = require("crypto");

const SponsoredTask =
    require("../models/SponsoredTask");

const SponsoredTaskSubmission =
    require("../models/SponsoredTaskSubmission");

const Wallet =
    require("../models/Wallet");

const Transaction =
    require("../models/Transaction");

const Notification =
    require("../models/Notification");

const {
    notifySponsoredTaskSubmission
} = require("./notificationService");

// ============================================================
// HELPERS
// ============================================================

function hashValue(value) {
    if (!value) {
        return "";
    }

    return crypto
        .createHash("sha256")
        .update(String(value))
        .digest("hex");
}

function getUserId(req) {
    return (
        req.user?._id ||
        req.user?.id ||
        null
    );
}

function getProjectId(req) {
    return (
        req.project?._id ||
        req.projectId ||
        null
    );
}

// ============================================================
// FRAUD SCORE
// ============================================================

function calculateFraudScore({
    task,
    user,
    req,
    proofUrl
}) {
    let score = 0;

    const flags = [];

    if (!proofUrl) {
        score += 40;

        flags.push(
            "missing_proof"
        );
    }

    if (
        task.targetUrl &&
        proofUrl &&
        String(proofUrl).trim() ===
            String(task.targetUrl).trim()
    ) {
        score += 25;

        flags.push(
            "proof_equals_target"
        );
    }

    if (
        !req.headers["user-agent"]
    ) {
        score += 5;

        flags.push(
            "missing_user_agent"
        );
    }

    if (!user?.deviceId) {
        score += 5;

        flags.push(
            "missing_device_id"
        );
    }

    return {
        score,
        flags
    };
}

// ============================================================
// AVAILABLE TASKS
// ============================================================

async function getAvailableTasks({
    projectId,
    userId
}) {
    const now = new Date();

    const tasks =
        await SponsoredTask.find({
            project: projectId,

            active: true,

            $and: [
                {
                    $or: [
                        {
                            startsAt: null
                        },
                        {
                            startsAt: {
                                $lte: now
                            }
                        }
                    ]
                },

                {
                    $or: [
                        {
                            endsAt: null
                        },
                        {
                            endsAt: {
                                $gte: now
                            }
                        }
                    ]
                },

                {
                    $or: [
                        {
                            maxCompletions:
                                null
                        },
                        {
                            $expr: {
                                $lt: [
                                    "$completionCount",
                                    "$maxCompletions"
                                ]
                            }
                        }
                    ]
                }
            ]
        })
            .sort({
                createdAt: -1
            })
            .lean();

    const approved =
        await SponsoredTaskSubmission.find({
            project: projectId,

            user: userId,

            status: {
                $in: [
                    "approved",
                    "clawed_back"
                ]
            }
        })
            .select("task")
            .lean();

    const completedIds =
        new Set(
            approved.map(
                item =>
                    String(item.task)
            )
        );

    return tasks.filter(
        task =>
            !completedIds.has(
                String(task._id)
            )
    );
}

// ============================================================
// SUBMIT TASK
// ============================================================
//
// Supports:
//
// - Cloudinary uploaded proof
// - direct proof URL
// - Cloudinary metadata
// - existing Telegram/admin notification
//
// IMPORTANT:
// Database submission is created first.
// Telegram notification is sent afterwards.
// Notification failure NEVER cancels the submission.
// ============================================================

async function submitTask({
    projectId,
    userId,
    taskId,
    proofUrl,
    proofType = "image",
    proofMetadata = {},
    req
}) {
    // --------------------------------------------------------
    // LOAD TASK
    // --------------------------------------------------------

    const task =
        await SponsoredTask.findOne({
            _id: taskId,
            project: projectId,
            active: true
        });

    if (!task) {
        const error =
            new Error(
                "Sponsored task not found or inactive"
            );

        error.statusCode = 404;

        throw error;
    }

    // --------------------------------------------------------
    // PREVENT DUPLICATE APPROVED COMPLETION
    // --------------------------------------------------------

    const existingApproved =
        await SponsoredTaskSubmission.findOne({
            project: projectId,
            task: taskId,
            user: userId,
            status: "approved"
        });

    if (existingApproved) {
        const error =
            new Error(
                "You have already completed this task"
            );

        error.statusCode = 409;

        throw error;
    }

    // --------------------------------------------------------
    // ATTEMPT NUMBER
    // --------------------------------------------------------

    const lastSubmission =
        await SponsoredTaskSubmission.findOne({
            project: projectId,
            task: taskId,
            user: userId
        })
            .sort({
                attemptNumber: -1
            });

    const attemptNumber =
        lastSubmission
            ? Number(
                  lastSubmission.attemptNumber ||
                      0
              ) + 1
            : 1;

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const user =
        req.user;

    // --------------------------------------------------------
    // FRAUD
    // --------------------------------------------------------

    const fraud =
        calculateFraudScore({
            task,
            user,
            req,
            proofUrl
        });

    // --------------------------------------------------------
    // CREATE SUBMISSION
    // --------------------------------------------------------

    const submission =
        await SponsoredTaskSubmission.create({
            project: projectId,

            task: taskId,

            user: userId,

            status: "pending",

            proofUrl:
                String(
                    proofUrl || ""
                ).trim(),

            proofType,

            proofHash:
                hashValue(proofUrl),

            targetUrl:
                task.targetUrl,

            verificationMode:
                task.verificationMode,

            rewardAmount:
                task.rewardAmount,

            currency:
                task.currency,

            attemptNumber,

            fraudScore:
                fraud.score,

            fraudFlags:
                fraud.flags,

            deviceId:
                user?.deviceId || "",

            ipHash:
                hashValue(
                    req.ip ||
                    req.headers[
                        "x-forwarded-for"
                    ] ||
                    ""
                ),

            userAgent:
                req.headers[
                    "user-agent"
                ] || "",

            // ------------------------------------------------
            // CLOUDINARY METADATA
            // ------------------------------------------------

            metadata:
                proofMetadata || {}
        });

    // ========================================================
    // ADMIN / TELEGRAM NOTIFICATION
    // ========================================================
    //
    // The Cloudinary secure URL is already in:
    //
    // submission.proofUrl
    //
    // notificationService sends that value as imageUrl.
    //
    // DO NOT allow notification failure to cancel the
    // successfully-created MongoDB submission.
    // ========================================================

    try {
        const notificationUser =
            await require(
                "../models/User"
            )
                .findById(userId)
                .select(
                    "username email deviceId"
                )
                .lean();

        await notifySponsoredTaskSubmission({
            projectId,

            submission,

            task,

            user:
                notificationUser
        });

    } catch (
        notificationError
    ) {
        console.error(
            "SPONSORED TASK ADMIN NOTIFICATION ERROR:",
            notificationError.message
        );
    }

    return submission;
}

// ============================================================
// APPROVE
// ============================================================

async function approveSubmission({
    projectId,
    submissionId,
    adminUserId,
    reviewNote = ""
}) {
    const submission =
        await SponsoredTaskSubmission.findOne({
            _id: submissionId,
            project: projectId
        });

    if (!submission) {
        const error =
            new Error(
                "Submission not found"
            );

        error.statusCode = 404;

        throw error;
    }

    // --------------------------------------------------------
    // IDEMPOTENT APPROVAL
    // --------------------------------------------------------

    if (
        submission.status ===
        "approved"
    ) {
        return {
            submission,
            idempotent: true
        };
    }

    if (
        submission.status !==
        "pending"
    ) {
        const error =
            new Error(
                "Only pending submissions can be approved"
            );

        error.statusCode = 409;

        throw error;
    }

    // --------------------------------------------------------
    // LOAD TASK
    // --------------------------------------------------------

    const task =
        await SponsoredTask.findOne({
            _id: submission.task,
            project: projectId
        });

    if (!task) {
        throw new Error(
            "Sponsored task no longer exists"
        );
    }

    // --------------------------------------------------------
    // VALIDATE REWARD
    // --------------------------------------------------------

    const amount =
        Number(
            submission.rewardAmount
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "Invalid task reward"
        );
    }

    // --------------------------------------------------------
    // TRANSACTION SESSION
    // --------------------------------------------------------

    const session =
        await SponsoredTaskSubmission.startSession();

    try {
        let result;

        await session.withTransaction(
            async () => {
                // ------------------------------------------------
                // RELOAD SUBMISSION INSIDE TRANSACTION
                // ------------------------------------------------

                const fresh =
                    await SponsoredTaskSubmission
                        .findOne({
                            _id: submissionId,
                            project: projectId
                        })
                        .session(session);

                if (!fresh) {
                    throw new Error(
                        "Submission not found"
                    );
                }

                // ------------------------------------------------
                // IDEMPOTENT CHECK
                // ------------------------------------------------

                if (
                    fresh.status ===
                    "approved"
                ) {
                    result = {
                        idempotent: true,
                        submission: fresh
                    };

                    return;
                }

                if (
                    fresh.status !==
                    "pending"
                ) {
                    throw new Error(
                        "Submission is no longer pending"
                    );
                }

                // ------------------------------------------------
                // LOAD WALLET
                // ------------------------------------------------

                const freshWallet =
                    await Wallet.findOne({
                        project: projectId,
                        user: fresh.user
                    }).session(
                        session
                    );

                if (!freshWallet) {
                    throw new Error(
                        "User wallet not found"
                    );
                }

                // ------------------------------------------------
                // CREDIT WALLET
                // ------------------------------------------------

                freshWallet.balance =
                    Number(
                        freshWallet.balance ||
                            0
                    ) + amount;

                freshWallet.totalEarned =
                    Number(
                        freshWallet.totalEarned ||
                            0
                    ) + amount;

                await freshWallet.save({
                    session
                });

                // ------------------------------------------------
                // CREATE TRANSACTION
                // ------------------------------------------------

                const transactions =
                    await Transaction.create(
                        [
                            {
                                project:
                                    projectId,

                                user:
                                    fresh.user,

                                type:
                                    "earning",

                                amount,

                                description:
                                    `Sponsored task reward: ${task.title}`,

                                status:
                                    "completed"
                            }
                        ],
                        {
                            session
                        }
                    );

                // ------------------------------------------------
                // UPDATE SUBMISSION
                // ------------------------------------------------

                fresh.status =
                    "approved";

                fresh.reviewedBy =
                    adminUserId;

                fresh.reviewedAt =
                    new Date();

                fresh.reviewNote =
                    reviewNote;

                fresh.transaction =
                    transactions[0]._id;

                await fresh.save({
                    session
                });

                // ------------------------------------------------
                // UPDATE TASK COMPLETION COUNT
                // ------------------------------------------------

                await SponsoredTask.updateOne(
                    {
                        _id: task._id,
                        project: projectId
                    },
                    {
                        $inc: {
                            completionCount: 1
                        }
                    },
                    {
                        session
                    }
                );

                // ------------------------------------------------
                // USER NOTIFICATION
                // ------------------------------------------------

                await Notification.create(
                    [
                        {
                            project:
                                projectId,

                            user:
                                fresh.user,

                            title:
                                "Sponsored task approved",

                            message:
                                `You earned ${amount} ${task.currency} for completing "${task.title}".`,

                            type:
                                "reward",

                            read:
                                false
                        }
                    ],
                    {
                        session
                    }
                );

                result = {
                    submission:
                        fresh,

                    transaction:
                        transactions[0]
                };
            }
        );

        return result;

    } finally {
        await session.endSession();
    }
}

// ============================================================
// REJECT
// ============================================================

async function rejectSubmission({
    projectId,
    submissionId,
    adminUserId,
    reason
}) {
    const submission =
        await SponsoredTaskSubmission.findOne({
            _id: submissionId,
            project: projectId
        });

    if (!submission) {
        const error =
            new Error(
                "Submission not found"
            );

        error.statusCode = 404;

        throw error;
    }

    if (
        submission.status !==
        "pending"
    ) {
        const error =
            new Error(
                "Only pending submissions can be rejected"
            );

        error.statusCode = 409;

        throw error;
    }

    submission.status =
        "rejected";

    submission.rejectionReason =
        String(
            reason ||
                "Proof could not be verified"
        ).trim();

    submission.reviewedBy =
        adminUserId;

    submission.reviewedAt =
        new Date();

    await submission.save();

    const task =
        await SponsoredTask.findOne({
            _id: submission.task,
            project: projectId
        });

    // --------------------------------------------------------
    // USER NOTIFICATION
    // --------------------------------------------------------

    await Notification.create({
        project: projectId,

        user: submission.user,

        title:
            "Sponsored task rejected",

        message:
            `Your submission for "${task?.title || "the sponsored task"}" was rejected. ${submission.rejectionReason}`,

        type:
            "system",

        read: false
    });

    return submission;
}

// ============================================================
// HISTORY
// ============================================================

async function getUserHistory({
    projectId,
    userId
}) {
    return SponsoredTaskSubmission.find({
        project: projectId,

        user: userId
    })
        .populate(
            "task",
            "title description imageUrl targetUrl platform rewardAmount currency"
        )
        .sort({
            createdAt: -1
        })
        .lean();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getProjectId,
    getUserId,

    getAvailableTasks,

    submitTask,

    approveSubmission,

    rejectSubmission,

    getUserHistory
};
