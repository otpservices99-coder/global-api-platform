const { MongoClient } = require("mongodb");

let client = null;
let db = null;
let connectionPromise = null;

const connectDB = async () => {
    if (db) {
        return db;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is not configured");
    }

    connectionPromise = (async () => {
        try {
            client = new MongoClient(uri, {
                maxPoolSize: 10,
                minPoolSize: 0,
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            });

            await client.connect();

            db = client.db();

            console.log("✅ MongoDB connected successfully");

            return db;
        } catch (error) {
            client = null;
            db = null;
            connectionPromise = null;

            console.error(
                "❌ MongoDB connection failed:",
                error.message
            );

            throw error;
        }
    })();

    return connectionPromise;
};

connectDB.getDB = async () => {
    return connectDB();
};

connectDB.getClient = () => {
    if (!client) {
        throw new Error("MongoDB client is not connected");
    }

    return client;
};

module.exports = connectDB;
