require("dotenv").config();

const connectDB = require("../config/database");
const User = require("../models/User");
const Project = require("../models/Project");

async function run(){

    await connectDB();

    const project = await Project.findOne({
        name:"Earnify"
    });

    const user = await User.findOne({
        email:"test@example.com"
    });

    user.project = project._id;

    await user.save();

    console.log("User linked to project");

    process.exit();

}

run();
