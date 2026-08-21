const Notification = require("../models/Notification");

async function createNotification({
    projectId,
    userId,
    title,
    message="",
    type="system",
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
        type
    };

    const options = session ? { session } : {};

    const docs = await Notification.create(
        [payload],
        options
    );

    return docs[0];
}

async function createWithdrawalApprovedNotification({
    projectId,
    withdrawal,
    session=null
}) {
    const amount = Number(withdrawal.amount || 0);

    return createNotification({
        projectId,
        userId: withdrawal.user,
        title: "Withdrawal approved",
        message: `Your payout of ₦${amount} was approved.`,
        type: "withdrawal",
        session
    });
}

async function createWithdrawalRejectedNotification({
    projectId,
    withdrawal,
    session=null
}) {
    const amount = Number(withdrawal.amount || 0);
    const reason =
        withdrawal.rejectionReason ||
        "Withdrawal rejected";

    return createNotification({
        projectId,
        userId: withdrawal.user,
        title: "Withdrawal rejected",
        message: `Your payout of ₦${amount} was rejected. ${reason}`,
        type: "withdrawal",
        session
    });
}

module.exports = {
    createNotification,
    createWithdrawalApprovedNotification,
    createWithdrawalRejectedNotification
};
