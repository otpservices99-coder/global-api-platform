const crypto = require("crypto");

const EarnProviderConfig =
    require("../models/EarnProviderConfig");

const EarnSession =
    require("../models/EarnSession");

const EarnPostback =
    require("../models/EarnPostback");

const Transaction =
    require("../models/Transaction");

const Action =
    require("../models/Action");

const {
    executeUniversalAction
} = require("./universalActionEngine");

const mongoose =
    require("mongoose");


const SESSION_TTL_MINUTES =
    Number(process.env.EARN_SESSION_TTL_MINUTES) || 30;


// ============================================================
// REQUEST CONTEXT
// ============================================================

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


// ============================================================
// SECURITY
// ============================================================

function safeCompare(a, b) {
    if (
        typeof a !== "string" ||
        typeof b !== "string"
    ) {
        return false;
    }

    const aBuffer =
        Buffer.from(a);

    const bBuffer =
        Buffer.from(b);

    if (
        aBuffer.length !==
        bBuffer.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        aBuffer,
        bBuffer
    );
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


// ============================================================
// POSTBACK INPUT
// ============================================================

function getExternalTxId(req) {
    return (
        req.body?.transaction_id ||
        req.body?.transactionId ||
        req.body?.txid ||
        req.body?.tx_id ||
        req.query?.transaction_id ||
        req.query?.transactionId ||
        req.query?.txid ||
        req.query?.tx_id ||
        null
    );
}


function getSessionId(req) {
    return (
        req.body?.sessionId ||
        req.body?.session_id ||
        req.body?.sub1 ||
        req.query?.sessionId ||
        req.query?.session_id ||
        req.query?.sub1 ||
        null
    );
}


function getUserSubId(req) {
    return (
        req.body?.sub2 ||
        req.query?.sub2 ||
        null
    );
}


function isCompletedStatus(status) {
    const value =
        String(status || "")
            .trim()
            .toLowerCase();

    return [
        "1",
        "ok",
        "success",
        "successful",
        "completed",
        "complete",
        "approved"
    ].includes(value);
}


// ============================================================
// CONFIG
// ============================================================

async function getConfig(projectId) {
    return EarnProviderConfig
        .findOne({
            project: projectId
        })
        .lean();
}


// ============================================================
// START EARNING SESSION
// ============================================================

async function createSession({
    projectId,
    userId,
    providerKey,
    placement
}) {

    const config =
        await getConfig(projectId);

    if (!config) {
        const error =
            new Error(
                "Earning providers are not configured"
            );

        error.statusCode = 404;

        throw error;
    }


    const provider =
        config.providers.find(
            item =>
                item.key === providerKey &&
                item.enabled === true
        );


    if (!provider) {
        const error =
            new Error(
                "Earning provider is unavailable"
            );

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
                new Error(
                    "Placement is unavailable"
                );

            error.statusCode = 400;

            throw error;
        }
    }


    const reward =
        Number(
            provider.userReward
        );


    if (
        !Number.isFinite(reward) ||
        reward <= 0
    ) {
        const error =
            new Error(
                "Provider reward is invalid"
            );

        error.statusCode = 500;

        throw error;
    }


    // ========================================================
    // DAILY CAP
    // ========================================================

    if (
        config.globalDailyEarnCap !== null &&
        config.globalDailyEarnCap !== undefined
    ) {

        const start =
            new Date();

        start.setHours(
            0,
            0,
            0,
            0
        );


        const end =
            new Date(start);

        end.setDate(
            end.getDate() + 1
        );


        const daily =
            await EarnPostback.aggregate([
                {
                    $match: {
                        project:
                            new mongoose.Types.ObjectId(
                                projectId
                            ),

                        user:
                            new mongoose.Types.ObjectId(
                                userId
                            ),

                        status:
                            "completed",

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
            Number(
                daily[0]?.total || 0
            );


        if (
            earnedToday >=
            Number(
                config.globalDailyEarnCap
            )
        ) {

            const error =
                new Error(
                    "Daily earning limit reached"
                );

            error.statusCode = 429;

            throw error;
        }
    }


    // ========================================================
    // SESSION EXPIRATION
    // ========================================================

    const expiresAt =
        new Date(
            Date.now() +
            SESSION_TTL_MINUTES *
            60 *
            1000
        );


    const session =
        await EarnSession.create({

            project:
                projectId,

            user:
                userId,

            provider:
                provider.key,

            placement:
                placement || null,

            userReward:
                reward,

            status:
                "pending",

            expiresAt
        });


    return {
        session,

        userReward:
            reward
    };
}


// ============================================================
// DYNAMIC OFFERS
// ============================================================

async function getOffers(projectId) {

    const config =
        await getConfig(projectId);


    if (!config) {
        return [];
    }


    const offers = [];


    for (
        const provider
        of config.providers || []
    ) {

        if (
            provider.enabled !== true
        ) {
            continue;
        }


        const reward =
            Number(
                provider.userReward
            );


        if (
            !Number.isFinite(reward) ||
            reward <= 0
        ) {
            continue;
        }


        const placements =
            provider.placements || [];


        if (!placements.length) {

            offers.push({

                id:
                    provider.key,

                title:
                    provider.key,

                provider:
                    provider.key,

                type:
                    "ad",

                userReward:
                    reward
            });


            continue;
        }


        for (
            const placement
            of placements
        ) {

            if (
                placement.enabled !== true
            ) {
                continue;
            }


            offers.push({

                id:
                    `${provider.key}:${placement.key}`,

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


// ============================================================
// FIND REWARD ACTION
// ============================================================
//
// The provider reward is dynamic.
// The action itself remains the existing universal
// reward.grant action stored in MongoDB.
//
// ============================================================

async function getRewardAction(projectId) {

    const action =
        await Action.findOne({

            project:
                projectId,

            name:
                "reward.grant",

            enabled:
                true

        });


    if (!action) {

        const error =
            new Error(
                "reward.grant action is not configured"
            );

        error.statusCode = 500;

        throw error;
    }


    return action;
}


// ============================================================
// PROCESS POSTBACK
// ============================================================

async function processPostback({
    providerKey,
    req
}) {

    const externalTxId =
        getExternalTxId(req);


    if (!externalTxId) {

        const error =
            new Error(
                "External transaction ID is required"
            );

        error.statusCode = 400;

        throw error;
    }


    // ========================================================
    // RESOLVE PROJECT
    // ========================================================

    let projectId =
        req.body?.projectId ||
        req.query?.projectId ||
        null;


    let config =
        null;


    const sessionId =
        getSessionId(req);


    if (!projectId && sessionId) {

        const lookupSession =
            await EarnSession.findById(
                sessionId
            );


        if (lookupSession) {

            projectId =
                lookupSession.project;

            config =
                await getConfig(
                    projectId
                );
        }
    }


    if (!projectId || !config) {

        const error =
            new Error(
                "Project context could not be resolved"
            );

        error.statusCode = 400;

        throw error;
    }


    // ========================================================
    // PROVIDER
    // ========================================================

    const provider =
        config.providers.find(
            item =>
                item.key === providerKey &&
                item.enabled === true
        );


    if (!provider) {

        const error =
            new Error(
                "Provider is unavailable"
            );

        error.statusCode = 404;

        throw error;
    }


    // ========================================================
    // SECRET
    // ========================================================

    const suppliedSecret =
        getPostbackSecret(req);


    if (
        !safeCompare(
            suppliedSecret,
            provider.postbackSecret
        )
    ) {

        const error =
            new Error(
                "Invalid postback secret"
            );

        error.statusCode = 403;

        throw error;
    }


    // ========================================================
    // STATUS
    // ========================================================

    const status =
        req.body?.status ||
        req.query?.status ||
        "completed";


    if (
        !isCompletedStatus(status)
    ) {

        return {

            success:
                true,

            credited:
                false,

            reason:
                "Postback status is not a completion"
        };
    }


    // ========================================================
    // SESSION
    // ========================================================

    let session =
        null;


    if (sessionId) {

        session =
            await EarnSession.findOne({

                _id:
                    sessionId,

                project:
                    projectId,

                provider:
                    providerKey
            });
    }


    if (
        !session &&
        getUserSubId(req)
    ) {

        session =
            await EarnSession.findOne({

                _id:
                    getUserSubId(req),

                project:
                    projectId,

                provider:
                    providerKey
            });
    }


    if (!session) {

        const error =
            new Error(
                "Earn session not found"
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        session.status !==
        "pending"
    ) {

        const existingCompleted =
            await EarnPostback.findOne({

                project:
                    projectId,

                provider:
                    providerKey,

                externalTxId
            });


        if (existingCompleted) {

            return {

                success:
                    true,

                duplicate:
                    true,

                credited:
                    false,

                postback:
                    existingCompleted
            };
        }


        const error =
            new Error(
                "Earn session is no longer pending"
            );

        error.statusCode = 409;

        throw error;
    }


    if (
        session.expiresAt <=
        new Date()
    ) {

        session.status =
            "expired";

        await session.save();


        const error =
            new Error(
                "Earn session expired"
            );

        error.statusCode = 410;

        throw error;
    }


    // ========================================================
    // SERVER-CONTROLLED REWARD
    // ========================================================

    const reward =
        Number(
            session.userReward
        );


    if (
        !Number.isFinite(reward) ||
        reward <= 0
    ) {

        const error =
            new Error(
                "Invalid session reward"
            );

        error.statusCode = 500;

        throw error;
    }


    // ========================================================
    // ATOMIC POSTBACK CLAIM
    // ========================================================
    //
    // We use the database's unique provider + externalTxId
    // identity as the duplicate protection boundary.
    //
    // ========================================================

    let postback;


    try {

        postback =
            await EarnPostback.create({

                project:
                    projectId,

                provider:
                    providerKey,

                externalTxId,

                user:
                    session.user,

                session:
                    session._id,

                amount:
                    reward,

                status:
                    "processing",

                metadata: {

                    provider:
                        providerKey,

                    externalTxId,

                    sessionId:
                        session._id
                },

                rawPostback:
                    req.body ||
                    req.query

            });

    } catch (error) {

        if (
            error &&
            error.code === 11000
        ) {

            const existing =
                await EarnPostback.findOne({

                    project:
                        projectId,

                    provider:
                        providerKey,

                    externalTxId
                });


            if (existing) {

                return {

                    success:
                        true,

                    duplicate:
                        true,

                    credited:
                        false,

                    postback:
                        existing
                };
            }
        }


        throw error;
    }


    // ========================================================
    // UNIVERSAL REWARD ENGINE
    // ========================================================

    try {

        const rewardAction =
            await getRewardAction(
                projectId
            );


        const result =
            await executeUniversalAction({

                actionRecord:
                    rewardAction,

                projectId,

                userId:
                    session.user,

                data: {

                    user:
                        session.user,

                    amount:
                        reward
                },

                req
            });


        // ====================================================
        // TRANSACTION RECORD
        // ====================================================

        const transaction =
            await Transaction.create({

                project:
                    projectId,

                user:
                    session.user,

                type:
                    "reward",

                amount:
                    reward,

                description:
                    `Reward from ${providerKey}`,

                status:
                    "completed",

                metadata: {

                    provider:
                        providerKey,

                    externalTxId,

                    sessionId:
                        session._id
                }
            });


        // ====================================================
        // COMPLETE POSTBACK
        // ====================================================

        postback.status =
            "completed";


        postback.amount =
            reward;


        postback.metadata = {

            provider:
                providerKey,

            externalTxId,

            sessionId:
                session._id
        };


        await postback.save();


        // ====================================================
        // COMPLETE SESSION
        // ====================================================

        session.status =
            "completed";


        session.completedAt =
            new Date();


        await session.save();


        return {

            success:
                true,

            duplicate:
                false,

            credited:
                true,

            amount:
                reward,

            transaction,

            rewardResult:
                result
        };

    } catch (error) {

        // ====================================================
        // DO NOT LEAVE A FAILED CLAIM LOOKING COMPLETED
        // ====================================================

        try {

            await EarnPostback.deleteOne({
                _id:
                    postback._id,

                status:
                    "processing"
            });

        } catch (cleanupError) {

            console.error(
                "EARN POSTBACK CLEANUP ERROR:",
                cleanupError
            );
        }


        throw error;
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    getProjectId,

    getUserId,

    getPostbackSecret,

    createSession,

    getOffers,

    processPostback
};
