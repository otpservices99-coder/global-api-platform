module.exports = (moduleKey) => {

    return (req, res, next) => {

        if (!req.project) {
            return res.status(500).json({
                success: false,
                message: "Project not loaded"
            });
        }

        const moduleData = req.project.modules.find(
            m => m.key === moduleKey
        );

        if (!moduleData || moduleData.enabled !== true) {
            return res.status(403).json({
                success: false,
                message: `${moduleKey} module is disabled`
            });
        }

        req.module = moduleData;

        next();

    };

};
