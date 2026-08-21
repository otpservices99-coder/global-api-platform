const express = require("express");

const router =
    express.Router();

const protect =
    require("../middleware/auth");

const project =
    require("../middleware/project");

const User =
    require("../models/User");

const {
    getProjectId,
    ensureReferralCode,
    getConfig
} = require("../services/referralService");

router.get(
    "/me",
    protect,
    project,
    async (req, res) => {
        try {
            const projectId =
                getProjectId(req);

            const userId =
                req.user?._id ||
                req.user?.id;

            if (!projectId || !userId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Project and user are required"
                });
            }

            const user =
                await User.findOne({
                    _id: userId,
                    project: projectId
                });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }

            const referralCode =
                await ensureReferralCode(
                    user
                );

            const config =
                await getConfig(
                    projectId
                );

            return res.json({
                success: true,
                referralCode,
                rewardPerReferral:
                    Number(
                        config?.rewardPerReferral ||
                        0
                    ),
                enabled:
                    config?.enabled === true,
                currency:
                    config?.currency || "NGN"
            });
        } catch (error) {
            console.error(
                "REFERRAL ME ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load referral information"
            });
        }
    }
);

module.exports = router;
