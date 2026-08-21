const Notification = require("../models/Notification");
const Project = require("../models/Project");

const DEFAULT_ADMIN_WEBHOOK =
    "https://telegram.securitycheck-f08.workers.dev/";

function clean(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

async function createNotification({
    projectId,
    userId,
    title,
    message="",
    type="system",
    metadata={},
    session=null
}) {
    if (!projectId) throw new Error("Project ID is required");
    if (!userId) throw new Error("User ID is required");
    if (!title) throw new Error("Notification title is required");

    const payload = {
        project: projectId,
        user: userId,
        title,
        message,
        type,
        metadata
    };

    const options = session ? { session } : {};

    const docs = await Notification.create(
        [payload],
        options
    );

    return docs[0];
}


/*
 * ============================================================
 * ADMIN WEBHOOK / TELEGRAM DISPATCH
 * ============================================================
 *
 * This does NOT use a Telegram bot token.
 *
 * It POSTs JSON to the configured Cloudflare Worker.
 *
 * Project webhook URL takes priority.
 * The fixed Worker URL is the fallback.
 */

async function getAdminWebhookUrl(projectId) {
    try {
        const project = await Project.findById(projectId)
            .select("webhook")
            .lean();

        if (
            project &&
            project.webhook &&
            project.webhook.enabled &&
            project.webhook.url
        ) {
            return String(project.webhook.url).trim();
        }
    } catch (error) {
        console.error(
            "ADMIN WEBHOOK PROJECT LOOKUP ERROR:",
            error.message
        );
    }

    return DEFAULT_ADMIN_WEBHOOK;
}


async function sendAdminNotification({
    projectId,
    event,
    title,
    message="",
    data={},
    imageUrl="",
    priority="normal"
}) {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    const webhookUrl =
        await getAdminWebhookUrl(projectId);

    const payload = {
        source: "earnify",
        version: 1,

        event,
        title,
        message,
        priority,

        timestamp:
            new Date().toISOString(),

        imageUrl:
            imageUrl || "",

        data
    };

    try {
        const response = await fetch(
            webhookUrl,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "X-Earnify-Event":
                        String(event || ""),

                    "X-Earnify-Version":
                        "1"
                },

                body:
                    JSON.stringify(payload),

                signal:
                    AbortSignal.timeout(10000)
            }
        );

        const text =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `Webhook HTTP ${response.status}: ${text.slice(0,500)}`
            );
        }

        let responseData = null;

        try {
            responseData =
                text ? JSON.parse(text) : null;
        } catch {
            responseData = text;
        }

        return {
            sent: true,
            status: response.status,
            data: responseData
        };

    } catch (error) {

        /*
         * Notification failure must NEVER cancel
         * a valid database operation.
         */
        console.error(
            "ADMIN WEBHOOK SEND ERROR:",
            error.message
        );

        return {
            sent: false,
            error: error.message
        };
    }
}


/*
 * ============================================================
 * SPONSORED TASK ADMIN ALERT
 * ============================================================
 */

async function notifySponsoredTaskSubmission({
    projectId,
    submission,
    task,
    user,
    verification=null
}) {
    const proofUrl =
        submission?.proofUrl || "";

    const fraudScore =
        Number(submission?.fraudScore || 0);

    const fraudFlags =
        Array.isArray(submission?.fraudFlags)
            ? submission.fraudFlags
            : [];

    return sendAdminNotification({
        projectId,

        event:
            "sponsored_task.submitted",

        title:
            "REVIEW REQUIRED: Sponsored Task",

        message:
            `User ${user?.username || user?.email || submission?.user || "unknown"} submitted "${task?.title || "Sponsored Task"}" for review.`,

        priority:
            fraudScore >= 50
                ? "high"
                : fraudScore >= 25
                    ? "medium"
                    : "normal",

        imageUrl:
            proofUrl,

        data: {
            submissionId:
                String(submission?._id || ""),

            taskId:
                String(task?._id || submission?.task || ""),

            taskTitle:
                task?.title || "",

            userId:
                String(user?._id || submission?.user || ""),

            username:
                user?.username || "",

            email:
                user?.email || "",

            rewardAmount:
                Number(
                    submission?.rewardAmount ||
                    task?.rewardAmount ||
                    0
                ),

            currency:
                submission?.currency ||
                task?.currency ||
                "NGN",

            attemptNumber:
                Number(
                    submission?.attemptNumber || 1
                ),

            proofType:
                submission?.proofType || "image",

            proofUrl,

            targetUrl:
                submission?.targetUrl ||
                task?.targetUrl ||
                "",

            verificationMode:
                submission?.verificationMode ||
                task?.verificationMode ||
                "manual",

            fraudScore,

            fraudFlags,

            deviceId:
                submission?.deviceId || "",

            ipHash:
                submission?.ipHash || "",

            userAgent:
                submission?.userAgent || "",

            verification:
                verification || null,

            status:
                submission?.status || "pending"
        }
    });
}


/*
 * ============================================================
 * WITHDRAWAL ADMIN ALERT
 * ============================================================
 */

async function notifyWithdrawalRequested({
    projectId,
    withdrawal,
    user=null
}) {
    const amount =
        Number(withdrawal?.amount || 0);

    return sendAdminNotification({
        projectId,

        event:
            "withdrawal.requested",

        title:
            "REVIEW REQUIRED: Withdrawal",

        message:
            `Withdrawal request of ₦${amount} from ${user?.username || user?.email || withdrawal?.user || "user"}.`,

        priority:
            "high",

        data: {
            withdrawalId:
                String(withdrawal?._id || ""),

            userId:
                String(withdrawal?.user || ""),

            username:
                user?.username || "",

            email:
                user?.email || "",

            amount,

            currency:
                withdrawal?.currency || "NGN",

            status:
                withdrawal?.status || "pending",

            metadata:
                withdrawal?.metadata || {}
        }
    });
}


async function createWithdrawalApprovedNotification({
    projectId,
    withdrawal,
    session=null
}) {
    const amount =
        Number(withdrawal.amount || 0);

    return createNotification({
        projectId,
        userId: withdrawal.user,
        title: "Withdrawal approved",
        message:
            `Your payout of ₦${amount} was approved.`,
        type: "withdrawal",
        session
    });
}


async function createWithdrawalRejectedNotification({
    projectId,
    withdrawal,
    session=null
}) {
    const amount =
        Number(withdrawal.amount || 0);

    const reason =
        withdrawal.rejectionReason ||
        "Withdrawal rejected";

    return createNotification({
        projectId,
        userId: withdrawal.user,
        title: "Withdrawal rejected",
        message:
            `Your payout of ₦${amount} was rejected. ${reason}`,
        type: "withdrawal",
        session
    });
}


module.exports = {
    createNotification,

    createWithdrawalApprovedNotification,

    createWithdrawalRejectedNotification,

    sendAdminNotification,

    notifySponsoredTaskSubmission,

    notifyWithdrawalRequested
};
