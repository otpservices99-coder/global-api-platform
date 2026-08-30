const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/auth");

const project =
    require("../middleware/project");

const {
    getProjectId,
    getUserId,
    createSession,
    getOffers,
    trackClick,
    getSessionStatus
} = require("../services/earnService");

/*
 * ============================================================
 * START EARNING SESSION
 * ============================================================
 *
 * POST /api/v1/earn/session
 *
 * Creates the tracking session.
 */
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

            /*
             * This is the URL the frontend should open.
             *
             * DO NOT open destinationUrl directly.
             */
            const clickUrl =
                `/api/v1/earn/click/${result.clickToken}?sessionId=${encodeURIComponent(
                    String(
                        result.session._id
                    )
                )}`;

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
                    result.session.expiresAt,

                /*
                 * Frontend opens this URL in the
                 * new tab.
                 */
                clickUrl,

                /*
                 * Informational only.
                 * Frontend should NOT open this directly.
                 */
                destinationUrl:
                    result.destinationUrl ||
                    null,

                clicked: false
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

/*
 * ============================================================
 * TRACK AD CLICK
 * ============================================================
 *
 * GET /api/v1/earn/click/:clickToken
 *
 * This endpoint is what the ads button opens.
 *
 * It:
 * 1. verifies the click token
 * 2. verifies the session
 * 3. records clicked=true
 * 4. records clickedAt
 * 5. redirects to the provider URL
 */
router.get(
    "/click/:clickToken",
    protect,
    project,
    async (req, res) => {
        try {
            const projectId =
                getProjectId(req);

            const userId =
                getUserId(req);

            const sessionId =
                req.query?.sessionId
                    ? String(
                          req.query.sessionId
                      ).trim()
                    : null;

            const clickToken =
                String(
                    req.params.clickToken ||
                        ""
                ).trim();

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Session ID is required"
                });
            }

            const result =
                await trackClick({
                    projectId,
                    userId,
                    sessionId,
                    clickToken
                });

            if (
                !result.destinationUrl
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Ad destination URL is not configured"
                });
            }

            /*
             * Redirect only AFTER the click
             * has been recorded.
             */
            return res.redirect(
                302,
                result.destinationUrl
            );
        } catch (error) {
            console.error(
                "EARN CLICK ERROR:",
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message ||
                    "Unable to track ad click"
            });
        }
    }
);

/*
 * ============================================================
 * CHECK SESSION STATUS
 * ============================================================
 *
 * GET /api/v1/earn/session/:sessionId/status
 *
 * Dashboard/rewards page polls this endpoint.
 */
router.get(
    "/session/:sessionId/status",
    protect,
    project,
    async (req, res) => {
        try {
            const projectId =
                getProjectId(req);

            const userId =
                getUserId(req);

            const sessionId =
                String(
                    req.params.sessionId ||
                        ""
                ).trim();

            const result =
                await getSessionStatus({
                    projectId,
                    userId,
                    sessionId
                });

            return res.json(result);
        } catch (error) {
            console.error(
                "EARN SESSION STATUS ERROR:",
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load earning session status"
            });
        }
    }
);

/*
 * ============================================================
 * EARNING OFFERS
 * ============================================================
 *
 * GET /api/v1/earn/offers
 */
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
