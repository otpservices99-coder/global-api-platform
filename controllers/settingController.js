const Setting = require("../models/Setting");

const getSettings = async (req, res) => {

    try {

        let settings = await Setting.findOne({
            project: req.project._id
        });

        if (!settings) {

            settings = await Setting.create({
                project: req.project._id
            });

        }

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const updateSettings = async (req, res) => {

    try {

        const settings = await Setting.findOneAndUpdate(

            {
                project: req.project._id
            },

            req.body,

            {
                new: true,
                upsert: true
            }

        );

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {

    getSettings,

    updateSettings

};
