const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Referral = require("../models/Referral");
const ReferralConfig = require("../models/ReferralConfig");
const Notification = require("../models/Notification");

// ============================================================
// PROJECT RESOLUTION
// ============================================================

function getProjectId(req) {
    if (!req) {
        return null;
    }

    return (
        req.projectId ||
        req.project?._id ||
        req.project?.id ||
        null
    );
}

// ============================================================
// REFERRAL CODE
// ============================================================

function generateReferralCode() {
    return crypto
        .randomBytes(6)
        .toString("hex")
        .toUpperCase();
}

async function createUniqueReferralCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = generateReferralCode();

        const exists = await User.exists({
            referralCode: code
        });

        if (!exists) {
            return code;
        }
    }

    throw new Error(
        "Unable to generate unique referral code"
    );
}

// ============================================================
// ENSURE REFERRAL CODE
// ============================================================

async function ensureReferralCode(user) {
    if (!user) {
        throw new Error("User is required");
    }

    if (user.referralCode) {
        return user.referralCode;
    }

    const code =
        await createUniqueReferralCode();

    await User.updateOne(
        {
            _id: user._id
        },
        {
            $set: {
                referralCode: code
            }
        }
    );

    user.referralCode = code;

    return code;
}

// ============================================================
// REFERRAL CONFIG
// ============================================================

async function getConfig(projectId) {
    if (!projectId) {
        return null;
    }

    return ReferralConfig
        .findOne({
            project: projectId
        })
        .lean();
}

// ============================================================
// APPLY REFERRAL
// ============================================================

async function applyReferral({
    projectId,
    referredUserId,
    referralCode
}) {
    if (!projectId) {
        return {
            applied: false,
            reason: "Project is required"
        };
    }

    if (!referredUserId) {
        return {
            applied: false,
            reason: "Referred user is required"
        };
    }

    if (!referralCode) {
        return {
            applied: false,
            reason: "No referral code supplied"
        };
    }

    // ========================================================
    // LOAD DYNAMIC CONFIG
    // ========================================================

    const config =
        await getConfig(projectId);

    if (
        !config ||
        config.enabled !== true
    ) {
        return {
            applied: false,
            reason: "Referral program disabled"
        };
    }

    const normalizedCode =
        String(referralCode)
            .trim()
            .toUpperCase();

    // ========================================================
    // FIND REFERRER
    // ========================================================

    const referrer =
        await User.findOne({
            project: projectId,
            referralCode: normalizedCode
        });

    if (!referrer) {
        const error =
            new Error(
                "Invalid referral code"
            );

        error.statusCode = 400;

        throw error;
    }

    // ========================================================
    // PREVENT SELF REFERRAL
    // ========================================================

    if (
        String(referrer._id) ===
        String(referredUserId)
    ) {
        const error =
            new Error(
                "You cannot refer yourself"
            );

        error.statusCode = 400;

        throw error;
    }

    // ========================================================
    // FIND REFERRED USER
    // ========================================================

    const referredUser =
        await User.findOne({
            _id: referredUserId,
            project: projectId
        });

    if (!referredUser) {
        const error =
            new Error(
                "Referred user not found"
            );

        error.statusCode = 404;

        throw error;
    }

    // ========================================================
    // ALREADY REFERRED
    // ========================================================

    if (referredUser.referredBy) {
        return {
            applied: false,
            alreadyReferred: true,
            reason:
                "User already has a referrer"
        };
    }

    const existing =
        await Referral.findOne({
            project: projectId,
            referredUser: referredUserId
        });

    if (existing) {
        return {
            applied: false,
            alreadyReferred: true,
            reason:
                "Referral already processed"
        };
    }

    // ========================================================
    // DYNAMIC REWARD
    // ========================================================

    const reward =
        Number(
            config.rewardPerReferral || 0
        );

    if (reward <= 0) {
        return {
            applied: false,
            reason:
                "Referral reward is disabled"
        };
    }

    // ========================================================
    // OPTIONAL REFERRER LIMIT
    // ========================================================

    if (
        config.maxReferralsPerUser !== null &&
        config.maxReferralsPerUser !== undefined
    ) {
        const count =
            await Referral.countDocuments({
                project: projectId,
                referrer: referrer._id,
                status: "completed"
            });

        if (
            count >=
            Number(
                config.maxReferralsPerUser
            )
        ) {
            return {
                applied: false,
                reason:
                    "Referrer limit reached"
            };
        }
    }

    // ========================================================
    // ATOMIC REFERRAL TRANSACTION
    // ========================================================

    const mongoSession =
        await mongoose.startSession();

    try {
        let result;

        await mongoSession.withTransaction(
            async () => {

                // --------------------------------------------
                // Reload referred user inside transaction
                // --------------------------------------------

                const freshUser =
                    await User.findOne({
                        _id: referredUserId,
                        project: projectId
                    }).session(
                        mongoSession
                    );

                if (!freshUser) {
                    throw new Error(
                        "Referred user not found"
                    );
                }

                // --------------------------------------------
                // Double-check referral state
                // --------------------------------------------

                if (freshUser.referredBy) {
                    result = {
                        applied: false,
                        alreadyReferred: true
                    };

                    return;
                }

                const duplicate =
                    await Referral.findOne({
                        project: projectId,
                        referredUser:
                            referredUserId
                    }).session(
                        mongoSession
                    );

                if (duplicate) {
                    result = {
                        applied: false,
                        alreadyReferred: true
                    };

                    return;
                }

                // --------------------------------------------
                // Referrer wallet
                // --------------------------------------------

                const wallet =
                    await Wallet.findOne({
                        project: projectId,
                        user: referrer._id
                    }).session(
                        mongoSession
                    );

                if (!wallet) {
                    throw new Error(
                        "Referrer wallet not found"
                    );
                }

                // --------------------------------------------
                // Credit wallet
                // --------------------------------------------

                wallet.balance =
                    Number(
                        wallet.balance || 0
                    ) + reward;

                wallet.totalEarned =
                    Number(
                        wallet.totalEarned || 0
                    ) + reward;

                await wallet.save({
                    session:
                        mongoSession
                });

                // --------------------------------------------
                // Create transaction
                // --------------------------------------------

                const transactions =
                    await Transaction.create(
                        [
                            {
                                project:
                                    projectId,

                                user:
                                    referrer._id,

                                type:
                                    "bonus",

                                amount:
                                    reward,

                                description:
                                    "Referral reward",

                                status:
                                    "completed",

                                metadata: {
                                    type:
                                        "referral",

                                    referredUser:
                                        referredUserId,

                                    referralCode:
                                        normalizedCode
                                }
                            }
                        ],
                        {
                            session:
                                mongoSession
                        }
                    );

                // --------------------------------------------
                // Create referral record
                // --------------------------------------------

                await Referral.create(
                    [
                        {
                            project:
                                projectId,

                            referrer:
                                referrer._id,

                            referredUser:
                                referredUserId,

                            rewardAmount:
                                reward,

                            status:
                                "completed",

                            metadata: {
                                referralCode:
                                    normalizedCode
                            }
                        }
                    ],
                    {
                        session:
                            mongoSession
                    }
                );

                // --------------------------------------------
                // Link referred user
                // --------------------------------------------

                freshUser.referredBy =
                    referrer._id;

                await freshUser.save({
                    session:
                        mongoSession
                });

                // --------------------------------------------
                // REFERRAL REWARD NOTIFICATION
                // --------------------------------------------
                // Notification failure must never undo the
                // completed referral financial transaction.
                // --------------------------------------------

                try {
                    await Notification.create(
                        [{
                            project: projectId,
                            user: referrer._id,
                            title: "Referral reward",
                            message:
                                "You earned " + reward + " " + (config.currency || "NGN") + " for a successful referral.",
                            type: "reward",
                            read: false
                        }],
                        {
                            session: mongoSession
                        }
                    );
                } catch (notificationError) {
                    console.error(
                        "REFERRAL NOTIFICATION ERROR:",
                        notificationError.message
                    );
                }

                // --------------------------------------------
                // Result
                // --------------------------------------------

                result = {
                    applied: true,

                    reward,

                    referrerId:
                        String(
                            referrer._id
                        ),

                    referredUserId:
                        String(
                            referredUserId
                        ),

                    transactionId:
                        String(
                            transactions[0]._id
                        )
                };
            }
        );

        return result;

    } finally {
        await mongoSession.endSession();
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getProjectId,
    ensureReferralCode,
    applyReferral,
    getConfig
};
