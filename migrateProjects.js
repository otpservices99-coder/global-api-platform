require("dotenv").config();

const mongoose = require("mongoose");

const Project = require("./models/Project");
const User = require("./models/User");

async function run() {

    await mongoose.connect(process.env.MONGODB_URI);

    const owner = await User.findOne({
        role: "platform_admin"
    });

    if (!owner) {
        console.log("No platform_admin found");
        process.exit();
    }

    const result = await Project.updateMany(
        {
            owner: { $exists: false }
        },
        {
            $set: {
                owner: owner._id
            }
        }
    );

    console.log(result);

    process.exit();
}

run();
