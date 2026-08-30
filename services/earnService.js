const crypto = require("crypto");
const mongoose = require("mongoose");

const EarnProviderConfig = require("../models/EarnProviderConfig");
const EarnSession = require("../models/EarnSession");
const EarnPostback = require("../models/EarnPostback");

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
    return req.user?._id || req.user?.id || null;
}

function safeCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
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

    return value ? String(value).trim() : null;
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

    return value ? String(value).trim() : null;
}

function isCompletedStatus(status) {
    const value = String(status || "completed")
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
    return EarnProviderConfig.findOne({
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

/*
 * Provider URL discovery.
 *
 * Supports common names so existing provider configuration
 * does not have to use one exact URL field name.
 */
function getProviderDestination(provider, placementKey = null) {
    if (!provider) {
        return null;
    }

    const placement =
        placementKey && Array.isArray(provider.placements)
            ? provider.placements.find(
                  item =>
                      item.key === placementKey &&
                      item.enabled === true
              )
            : null;

    const candidates = [
        placement?.url,
        placement?.targetUrl,
        placement?.targetURL,
        placement?.link,
        placement?.adUrl,
        placement?.adURL,
        placement?.destinationUrl,
        placement?.destinationURL,

        provider.url,
        provider.targetUrl,
        provider.targetURL,
        provider.link,
        provider.adUrl,
        provider.adURL,
        provider.destinationUrl,
        provider.destinationURL
    ];

    const url = candidates.find(
        value =>
            typeof value === "string" &&
            value.trim()
    );

    return url ? url.trim() : null;
}

function validateDestinationUrl(value) {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value);

        if (!["http:", "https:"].includes(url.protocol)) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
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

function createClickToken() {
    return crypto.randomBytes(32).toString("hex");
}

function hashClickToken(token) {
    return crypto
        .createHash("sha256")
        .update(String(token))
        .digest("hex");
}

function getSessionCollection() {
    return mongoose.connection.collection("earnsessions");
}

async function storeClickData(sessionId, token, destinationUrl) {
    const tokenHash = hashClickToken(token);

    await getSessionCollection().updateOne(
        {
            _id: new mongoose.Types.ObjectId(sessionId)
        },
        {
            $set: {
                clickTokenHash: tokenHash,
                destinationUrl,
                clicked: false,
                clickedAt: null
            }
        }
    );
}

async function createSession({
    projectId,
    userId,
    providerKey,
    placement
}) {
    const config = await getConfig(projectId);

    if (!config) {
        const error = new Error(
            "Earning providers are not configured"
        );
        error.statusCode = 404;
        throw error;
    }

    const provider = getConfiguredProvider(
        config,
        providerKey
    );

    if (!provider) {
        const error = new Error(
            "Earning provider is unavailable"
        );
        error.statusCode = 404;
        throw error;
    }

    let configuredPlacement = null;

    if (placement) {
        configuredPlacement =
            (provider.placements || []).find(
                item =>
                    item.key === placement &&
                    item.enabled === true
            );

        if (!configuredPlacement) {
            const error = new Error(
                "Placement is unavailable"
            );
            error.statusCode = 400;
            throw error;
        }
    }

    const reward = Number(provider.userReward);

    if (!Number.isFinite(reward) || reward <= 0) {
        const error = new Error(
            "Provider reward is invalid"
        );
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

        const daily = await EarnPostback.aggregate([
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
            const error = new Error(
                "Daily earning limit reached"
            );

            error.statusCode = 429;

            throw error;
        }
    }

    const expiresAt = new Date(
        Date.now() +
            SESSION_TTL_MINUTES * 60 * 1000
    );

    const session = await EarnSession.create({
        project: projectId,
        user: userId,
        provider: provider.key,
        placement: placement || null,
        userReward: reward,
        status: "pending",
        expiresAt
    });

    /*
     * IMPORTANT:
     * Click tracking is stored directly in the MongoDB
     * collection so EarnSession.js does not need to be
     * modified.
     */
    const destinationUrl = validateDestinationUrl(
        getProviderDestination(
            provider,
            placement
        )
    );

    const clickToken = createClickToken();

    await storeClickData(
        session._id,
        clickToken,
        destinationUrl
    );

    return {
        session,
        userReward: reward,
        clickToken,
        destinationUrl
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
            const destinationUrl =
                validateDestinationUrl(
                    getProviderDestination(provider)
                );

            offers.push({
                id: provider.key,
                title: provider.key,
                provider: provider.key,
                type: "ad",
                userReward: reward,
                destinationUrl
            });

            continue;
        }

        for (const placement of placements) {
            if (placement.enabled !== true) {
                continue;
            }

            const destinationUrl =
                validateDestinationUrl(
                    getProviderDestination(
                        provider,
                        placement.key
                    )
                );

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

                placement:
                    placement.key,

                type:
                    placement.type ||
                    "ad",

                userReward:
                    reward,

                destinationUrl
            });
        }
    }

    return offers;
}

/*
 * Mark a session as clicked and return its destination.
 *
 * This is called by the ads button BEFORE redirecting
 * the user to the actual provider URL.
 */
async function trackClick({
    projectId,
    userId,
    sessionId,
    clickToken
}) {
    if (!projectId) {
        const error = new Error(
            "Project ID is required"
        );
        error.statusCode = 400;
        throw error;
    }

    if (!userId) {
        const error = new Error(
            "User ID is required"
        );
        error.statusCode = 401;
        throw error;
    }

    if (!sessionId) {
        const error = new Error(
            "Session ID is required"
        );
        error.statusCode = 400;
        throw error;
    }

    if (!clickToken) {
        const error = new Error(
            "Click token is required"
        );
        error.statusCode = 400;
        throw error;
    }

    if (!mongoose.isValidObjectId(sessionId)) {
        const error = new Error(
            "Invalid earning session"
        );
        error.statusCode = 400;
        throw error;
    }

    const session = await EarnSession.findOne({
        _id: sessionId,
        project: projectId,
        user: userId
    });

    if (!session) {
        const error = new Error(
            "Earn session not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (session.status !== "pending") {
        const error = new Error(
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

        const error = new Error(
            "Earn session expired"
        );
        error.statusCode = 410;

        throw error;
    }

    const tokenHash = hashClickToken(
        clickToken
    );

    const collection =
        getSessionCollection();

    const existing =
        await collection.findOne({
            _id: new mongoose.Types.ObjectId(
                sessionId
            )
        });

    if (!existing) {
        const error = new Error(
            "Earn session not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (
        !existing.clickTokenHash ||
        !safeCompare(
            tokenHash,
            existing.clickTokenHash
        )
    ) {
        const error = new Error(
            "Invalid click token"
        );
        error.statusCode = 403;
        throw error;
    }

    const clickedAt =
        existing.clickedAt ||
        new Date();

    await collection.updateOne(
        {
            _id: new mongoose.Types.ObjectId(
                sessionId
            ),
            clickTokenHash: tokenHash
        },
        {
            $set: {
                clicked: true,
                clickedAt
            }
        }
    );

    return {
        success: true,
        clicked: true,
        clickedAt,
        sessionId: String(session._id),
        destinationUrl:
            existing.destinationUrl || null
    };
}

async function getSessionStatus({
    projectId,
    userId,
    sessionId
}) {
    if (!projectId || !userId || !sessionId) {
        const error = new Error(
            "Project, user and session are required"
        );

        error.statusCode = 400;

        throw error;
    }

    if (!mongoose.isValidObjectId(sessionId)) {
        const error = new Error(
            "Invalid earning session"
        );

        error.statusCode = 400;

        throw error;
    }

    const session = await EarnSession.findOne({
        _id: sessionId,
        project: projectId,
        user: userId
    }).lean();

    if (!session) {
        const error = new Error(
            "Earn session not found"
        );

        error.statusCode = 404;

        throw error;
    }

    const collection =
        getSessionCollection();

    const tracking =
        await collection.findOne(
            {
                _id:
                    new mongoose.Types.ObjectId(
                        sessionId
                    )
            },
            {
                projection: {
                    clicked: 1,
                    clickedAt: 1
                }
            }
        );

    return {
        success: true,
        sessionId: String(session._id),
        status: session.status,
        clicked:
            tracking?.clicked === true,
        clickedAt:
            tracking?.clickedAt || null,
        completed:
            session.status === "completed",
        expired:
            session.status === "expired"
    };
}

async function processPostback({
    providerKey,
    req
}) {
    const externalTxId =
        getExternalTxId(req);

    if (!externalTxId) {
        const error = new Error(
            "External transaction ID is required. Accepted parameters: transaction_id, tx, externalTxId, transactionId"
        );

        error.statusCode = 400;

        throw error;
    }

    const sessionId =
        getSessionId(req);

    if (!sessionId) {
        const error = new Error(
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
        const error = new Error(
            "Earn session not found"
        );

        error.statusCode = 404;

        throw error;
    }

    const projectId =
        session.project;

    const config =
        await getConfig(projectId);

    if (!config) {
        const error = new Error(
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
        const error = new Error(
            "Provider is unavailable"
        );

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
        const error = new Error(
            "Invalid postback secret"
        );

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
            amount:
                Number(existing.amount || 0),
            userId:
                String(existing.user),
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
            userId:
                String(session.user),
            message:
                "Postback received but status is not a completion"
        };
    }

    if (session.status !== "pending") {
        const error = new Error(
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

        const error = new Error(
            "Earn session expired"
        );

        error.statusCode = 410;

        throw error;
    }

    const reward =
        Number(session.userReward);

    if (
        !Number.isFinite(reward) ||
        reward <= 0
    ) {
        const error = new Error(
            "Invalid session reward"
        );

        error.statusCode = 500;

        throw error;
    }

    /*
     * IMPORTANT:
     * We intentionally do NOT modify wallet balance here.
     *
     * Postback processing remains separate from click tracking.
     */
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
                                duplicate.amount ||
                                    0
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

                await EarnPostback.create(
                    [
                        {
                            project: projectId,
                            provider:
                                providerKey,
                            externalTxId,
                            user:
                                session.user,
                            session:
                                session._id,
                            amount: reward,
                            status: "completed",
                            metadata: {
                                provider:
                                    providerKey,
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
                    credited: false,
                    duplicate: false,
                    amount: reward,
                    userId:
                        String(
                            session.user
                        ),
                    transactionId: null
                };
            }
        );

        return result;
    } catch (error) {
        if (error?.code === 11000) {
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
                            duplicate.amount ||
                                0
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
    createSession,
    getOffers,
    trackClick,
    getSessionStatus,
    processPostback
};
