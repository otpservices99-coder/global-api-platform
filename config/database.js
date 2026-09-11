const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(
        process.env.MONGODB_URI
    )
    .then(() => {
        console.log("✅ MongoDB connected successfully");
        return mongoose.connection;
    })
    .catch((error) => {
        connectionPromise = null;

        console.error(
            "❌ MongoDB connection failed:",
            error.message
        );

        throw error;
    });

    return connectionPromise;
};

module.exports = connectDB;
