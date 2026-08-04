const getProfile = async (req, res) => {
    try {
        res.json({
            message: "Profile loaded successfully",
            user: req.user
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getProfile
};
