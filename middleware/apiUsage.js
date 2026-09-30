const connectDB = require("../config/database");

module.exports = async (req, res, next) => {
    try {
        if (req.project) {
            const db = await connectDB();

            await db.collection("apiusages").insertOne({
                project: req.project._id,

                endpoint:
                    req.originalUrl,

                method:
                    req.method,

                ip:
                    req.ip,

                createdAt:
                    new Date(),

                updatedAt:
                    new Date()
            });
        }

        next();

    } catch (error) {
        console.log(
            "API meter error:",
            error.message
        );

        /*
         * API usage tracking must NEVER break
         * an otherwise valid API request.
         */
        next();
    }
};
