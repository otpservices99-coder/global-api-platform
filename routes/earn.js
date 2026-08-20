const express = require("express");

const router =
    express.Router();

const protect =
    require("../middleware/auth");

const project =
    require("../middleware/project");

const {
    getProjectId,
    getUserId,
    createSession,
    getOffers
} = require("../services/earnService");


// ============================================================
// START EARNING SESSION
// ============================================================
//
// POST /api/v1/earn/session
//
// Requires:
// Authorization: Bearer <user JWT>
// X-API-Key: <project API key>
// ============================================================

router.post(
    "/session",
    protect,
    project,
    async (req, res) => {
        try {
            const projectId =
                getProjectId(req);

            const userId =
                getUserId(req);

            const provider =
                String(
                    req.body?.provider || ""
                ).trim();

            const placement =
                req.body?.placement
                    ? String(
                        req.body.placement
                    ).trim()
                    : null;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Project context is required"
                });
            }

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user is required"
                });
            }

            if (!provider) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Provider is required"
                });
            }

            const result =
                await createSession({
                    projectId,
                    userId,
                    providerKey:
                        provider,
                    placement
                });

            return res.status(201).json({
                success: true,
                sessionId:
                    result.session._id,
                userReward:
                    result.userReward,
                provider:
                    result.session.provider,
                placement:
                    result.session.placement,
                expiresAt:
                    result.session.expiresAt
            });

        } catch (error) {
            console.error(
                "EARN SESSION ERROR:",
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message ||
                    "Unable to create earning session"
            });
        }
    }
);


// ============================================================
// EARNING OFFERS
// ============================================================
//
// GET /api/v1/earn/offers
// ============================================================

router.get(
    "/offers",
    protect,
    project,
    async (req, res) => {
        try {
            const projectId =
                getProjectId(req);

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Project context is required"
                });
            }

            const offers =
                await getOffers(
                    projectId
                );

            return res.json({
                success: true,
                offers
            });

        } catch (error) {
            console.error(
                "EARN OFFERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load earning offers"
            });
        }
    }
);


module.exports = router;
