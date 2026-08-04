require("dotenv").config();

const mongoose = require("mongoose");

const fix = async () => {

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected");

        const collection = mongoose.connection.collection("wallets");

        const indexes = await collection.indexes();

        console.log(indexes);

        const userIndex = indexes.find(
            index => index.name === "user_1"
        );

        if (userIndex) {

            await collection.dropIndex("user_1");

            console.log("Removed old user_1 index");

        } else {

            console.log("Old user_1 index not found");

        }


        await collection.createIndex(
            {
                project: 1,
                user: 1
            },
            {
                unique: true
            }
        );

        console.log("Created project_user unique index");


        await mongoose.disconnect();

        console.log("Done");

    } catch (error) {

        console.error(error);

        process.exit(1);

    }

};


fix();
