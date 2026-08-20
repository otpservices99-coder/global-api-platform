
const crypto = require("crypto");
const mongoose = require("mongoose");

const EarnProviderConfig = require("../models/EarnProviderConfig");
const EarnSession = require("../models/EarnSession");
const EarnPostback = require("../models/EarnPostback");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const SESSION_TTL_MINUTES =
    Number(process.env.EARN_SESSION_TTL_MINUTES) || 30;

function getProjectId(req) {
    return (
        req.projectId ||
        req.project?._id ||
        req.project?.id ||
        req.user?.project ||
        null
    );
}

function getUserId(req) {
    return (
        req.user?._id ||
        req.user?.id ||
        null
    );
}

function safeCompare(a, b) {
    if (
        typeof a !== "string" ||
        typeof b !== "string"
    ) {
        return false;
    }

    const aa = Buffer.from(a);
    const bb = Buffer.from(b);

    if (aa.length !== bb.length) {
        return false;
    }

    return crypto.timingSafeEqual(aa, bb);
}

function getPostbackSecret(req) {
    return (
        req.get("X-Postback-Secret") ||
        req.get("X-Provider-Secret") ||
        req.query?.secret ||
        req.body?.secret ||
        null
    );
}

function getExternalTxId(req) {
    const value =
        req.body?.transaction_id ||
        req.body?.tx ||
        req.body?.externalTxId ||
        req.body?.transactionId ||
        req.query?.transaction_id ||
        req.query?.tx ||
        req.query?.externalTxId ||
        req.query?.transactionId ||
        null;

    return value
        ? String(value).trim()
        : null;
}

function getSessionId(req) {
    const value =
        req.body?.sessionId ||
        req.body?.session_id ||
        req.body?.sub1 ||
        req.query?.sessionId ||
        req.query?.session_id ||
        req.query?.sub1 ||
        null;

    return value
        ? String(value).trim()
        : null;
}

function isCompletedStatus(status) {
    const value =
        String(status || "completed")
            .trim()
            .toLowerCase();

    return [
        "1",
        "ok",
        "success",
        "successful",
        "completed",
        "complete",
        "approved",
        "done",
        "paid"
    ].includes(value);
}

async function getConfig(projectId) {
    return EarnProviderConfig
        .findOne({
            project: projectId
        })
        .select("+providers.postbackSecret")
        .lean();
}

function getConfiguredProvider(config, providerKey) {
    return (config?.providers || []).find(
        provider =>
            provider.key === providerKey &&
            provider.enabled === true
    );
}

function resolveProviderSecret(provider) {
    if (
        provider &&
        typeof provider.postbackSecret === "string" &&
        provider.postbackSecret.trim()
    ) {
        return provider.postbackSecret.trim();
    }

    if (
        typeof process.env.POSTBACK_SECRET === "string" &&
        process.env.POSTBACK_SECRET.trim()
    ) {
        return process.env.POSTBACK_SECRET.trim();
    }

    return null;
}

async function createSession({
    projectId,
    userId,
    providerKey,
    placement
}) {
    const config = await getConfig(projectId);

    if (!config) {
        const error =
            new Error("Earning providers are not configured");

        error.statusCode = 404;
        throw error;
    }

    const provider =
        getConfiguredProvider(
            config,
            providerKey
        );

    if (!provider) {
        const error =
            new Error("Earning provider is unavailable");

        error.statusCode = 404;
        throw error;
    }

    if (placement) {
        const configuredPlacement =
            (provider.placements || []).find(
                item =>
                    item.key === placement &&
                    item.enabled === true
            );

        if (!configuredPlacement) {
            const error =
                new Error("Placement is unavailable");

            error.statusCode = 400;
            throw error;
        }
    }

    const reward = Number(provider.userReward);

    if (!Number.isFinite(reward) || reward <= 0) {
        const error =
            new Error("Provider reward is invalid");

        error.statusCode = 500;
        throw error;
    }

    if (
        config.globalDailyEarnCap !== null &&
        config.globalDailyEarnCap !== undefined
    ) {
        const start = new Date();

        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const daily =
            await EarnPostback.aggregate([
                {
                    $match: {
                        project:
                            new mongoose.Types.ObjectId(projectId),
                        user:
                            new mongoose.Types.ObjectId(userId),
                        status: "completed",
                        createdAt: {
                            $gte: start,
                            $lt: end
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$amount"
                        }
                    }
                }
            ]);

        const earnedToday =
            Number(daily[0]?.total || 0);

        if (
            earnedToday >=
            Number(config.globalDailyEarnCap)
        ) {
            const error =
                new Error("Daily earning limit reached");

            error.statusCode = 429;
            throw error;
        }
    }

    const expiresAt =
        new Date(
            Date.now() +
            SESSION_TTL_MINUTES * 60 * 1000
        );

    const session =
        await EarnSession.create({
            project: projectId,
            user: userId,
            provider: provider.key,
            placement: placement || null,
            userReward: reward,
            status: "pending",
            expiresAt
        });

    return {
        session,
        userReward: reward
    };
}

async function getOffers(projectId) {
    const config = await getConfig(projectId);

    if (!config) {
        return [];
    }

    const offers = [];

    for (const provider of config.providers || []) {
        if (provider.enabled !== true) {
            continue;
        }

        const reward = Number(provider.userReward);

        if (!Number.isFinite(reward) || reward <= 0) {
            continue;
        }

        const placements =
            provider.placements || [];

        if (!placements.length) {
            offers.push({
                id: provider.key,
                title: provider.key,
                provider: provider.key,
                type: "ad",
                userReward: reward
            });

            continue;
        }

        for (const placement of placements) {
            if (placement.enabled !== true) {
                continue;
            }

            offers.push({
                id:
                    provider.key +
                    ":" +
                    placement.key,

                title:
                    placement.title ||
                    placement.key,

                provider:
                    provider.key,

                type:
                    placement.type ||
                    "ad",

                userReward:
                    reward
            });
        }
    }

    return offers;
}

async function processPostback({
    providerKey,
    req
}) {
    const externalTxId =
        getExternalTxId(req);

    if (!externalTxId) {
        const error =
            new Error(
                "External transaction ID is required. Accepted parameters: transaction_id, tx, externalTxId, transactionId"
            );

        error.statusCode = 400;
        throw error;
    }

    const sessionId =
        getSessionId(req);

    if (!sessionId) {
        const error =
            new Error(
                "Session ID is required. Use sessionId or sub1"
            );

        error.statusCode = 400;
        throw error;
    }

    let session = null;

    if (mongoose.isValidObjectId(sessionId)) {
        session =
            await EarnSession.findOne({
                _id: sessionId,
                provider: providerKey
            });
    }

    if (!session) {
        const error =
            new Error("Earn session not found");

        error.statusCode = 404;
        throw error;
    }

    const projectId =
        session.project;

    const config =
        await getConfig(projectId);

    if (!config) {
        const error =
            new Error(
                "Earning provider configuration not found"
            );

        error.statusCode = 404;
        throw error;
    }

    const provider =
        getConfiguredProvider(
            config,
            providerKey
        );

    if (!provider) {
        const error =
            new Error("Provider is unavailable");

        error.statusCode = 404;
        throw error;
    }

    const suppliedSecret =
        getPostbackSecret(req);

    const expectedSecret =
        resolveProviderSecret(provider);

    if (
        !expectedSecret ||
        !safeCompare(
            suppliedSecret,
            expectedSecret
        )
    ) {
        const error =
            new Error("Invalid postback secret");

        error.statusCode = 403;
        throw error;
    }

    const existing =
        await EarnPostback.findOne({
            project: projectId,
            provider: providerKey,
            externalTxId
        });

    if (existing) {
        return {
            success: true,
            credited: false,
            duplicate: true,
            amount: Number(existing.amount || 0),
            userId: String(existing.user),
            message:
                "Postback already processed"
        };
    }

    const status =
        req.body?.status ||
        req.query?.status ||
        "completed";

    if (!isCompletedStatus(status)) {
        return {
            success: true,
            credited: false,
            duplicate: false,
            amount: 0,
            userId: String(session.user),
            message:
                "Postback received but status is not a completion"
        };
    }

    if (session.status !== "pending") {
        const error =
            new Error(
                "Earn session is no longer pending"
            );

        error.statusCode = 409;
        throw error;
    }

    if (
        session.expiresAt &&
        session.expiresAt <= new Date()
    ) {
        session.status = "expired";
        await session.save();

        const error =
            new Error("Earn session expired");

        error.statusCode = 410;
        throw error;
    }

    const reward =
        Number(session.userReward);

    if (!Number.isFinite(reward) || reward <= 0) {
        const error =
            new Error("Invalid session reward");

        error.statusCode = 500;
        throw error;
    }

    const mongoSession =
        await mongoose.startSession();

    try {
        let result = null;

        await mongoSession.withTransaction(
            async () => {
                const duplicate =
                    await EarnPostback.findOne({
                        project: projectId,
                        provider: providerKey,
                        externalTxId
                    }).session(
                        mongoSession
                    );

                if (duplicate) {
                    result = {
                        success: true,
                        credited: false,
                        duplicate: true,
                        amount:
                            Number(
                                duplicate.amount || 0
                            ),
                        userId:
                            String(
                                duplicate.user
                            ),
                        message:
                            "Postback already processed"
                    };

                    return;
                }

                const wallet =
                    await Wallet.findOne({
                        project: projectId,
                        user: session.user
                    }).session(
                        mongoSession
                    );

                if (!wallet) {
                    const error =
                        new Error(
                            "Wallet not found"
                        );

                    error.statusCode = 404;
                    throw error;
                }

                wallet.balance =
                    Number(wallet.balance || 0) +
                    reward;

                wallet.totalEarned =
                    Number(wallet.totalEarned || 0) +
                    reward;

                await wallet.save({
                    session: mongoSession
                });

                const transaction =
                    await Transaction.create(
                        [
                            {
                                project: projectId,
                                user: session.user,
                                type: "earning",
                                amount: reward,
                                description:
                                    "Reward from " +
                                    providerKey,
                                status: "completed",
                                metadata: {
                                    provider:
                                        providerKey,
                                    externalTxId:
                                        externalTxId,
                                    sessionId:
                                        String(
                                            session._id
                                        )
                                }
                            }
                        ],
                        {
                            session:
                                mongoSession
                        }
                    );

                await EarnPostback.create(
                    [
                        {
                            project: projectId,
                            provider: providerKey,
                            externalTxId:
                                externalTxId,
                            user: session.user,
                            session: session._id,
                            amount: reward,
                            status: "completed",
                            metadata: {
                                provider:
                                    providerKey,
                                externalTxId:
                                    externalTxId,
                                sessionId:
                                    String(
                                        session._id
                                    )
                            },
                            rawPostback:
                                req.body ||
                                req.query ||
                                {}
                        }
                    ],
                    {
                        session:
                            mongoSession
                    }
                );

                session.status =
                    "completed";

                session.completedAt =
                    new Date();

                await session.save({
                    session:
                        mongoSession
                });

                result = {
                    success: true,
                    credited: true,
                    duplicate: false,
                    amount: reward,
                    userId:
                        String(session.user),
                    transactionId:
                        String(
                            transaction[0]._id
                        )
                };
            }
        );

        return result;
    } catch (error) {
        if (
            error?.code === 11000
        ) {
            const duplicate =
                await EarnPostback.findOne({
                    project: projectId,
                    provider: providerKey,
                    externalTxId
                });

            if (duplicate) {
                return {
                    success: true,
                    credited: false,
                    duplicate: true,
                    amount:
                        Number(
                            duplicate.amount || 0
                        ),
                    userId:
                        String(
                            duplicate.user
                        ),
                    message:
                        "Postback already processed"
                };
            }
        }

        throw error;
    } finally {
        await mongoSession.endSession();
    }
}

module.exports = {
    getProjectId,
    getUserId,
    getPostbackSecret,
    createSession,
    getOffers,
    processPostback
};
