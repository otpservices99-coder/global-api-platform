const AuditLog = require("../models/AuditLog");

const getLogs = async (req, res) => {

    try {

        const logs = await AuditLog.find({
            project: req.project._id
        })
        .sort({ createdAt: -1 })
        .limit(100);

        res.json({
            success: true,
            total: logs.length,
            data: logs
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    getLogs
};
