const connectDB = require("../config/database");


// ============================================================
// GET PROJECT SETTINGS
// ============================================================

const getSettings = async (req, res) => {
    try {
        const db = await connectDB();

        const projectId =
            req.project?._id ||
            req.project?.id;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project context missing"
            });
        }

        let settings =
            await db.collection("settings").findOne({
                project: projectId
            });

        // Preserve the old Mongoose behavior:
        // create settings automatically when none exist.
        if (!settings) {
            const result =
                await db.collection("settings").insertOne({
                    project: projectId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

            settings =
                await db.collection("settings").findOne({
                    _id: result.insertedId
                });
        }

        return res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error(
            "Get settings error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// UPDATE PROJECT SETTINGS
// ============================================================

const updateSettings = async (req, res) => {
    try {
        const db = await connectDB();

        const projectId =
            req.project?._id ||
            req.project?.id;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project context missing"
            });
        }

        const allowed = [
            "currency",
            "minimumWithdrawal",
            "referralBonus",
            "dailyBonus",
            "rewardedVideoReward",
            "siteName",
            "logo",
            "maintenance"
        ];

        const updates = {};

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        updates.updatedAt = new Date();

        await db.collection("settings").updateOne(
            {
                project: projectId
            },
            {
                $set: updates,
                $setOnInsert: {
                    project: projectId,
                    createdAt: new Date()
                }
            },
            {
                upsert: true
            }
        );

        const settings =
            await db.collection("settings").findOne({
                project: projectId
            });

        return res.json({
            success: true,
            message: "Settings updated",
            data: settings
        });

    } catch (error) {
        console.error(
            "Update settings error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = {
    getSettings,
    updateSettings
};
