require("dotenv").config();

const connectDB=require("../config/database");

const Project=require("../models/Project");

async function run(){

    await connectDB();

    const project=await Project.create({

        name:"Earnify",

        domain:"earnify.com"

    });

    console.log(project);

    process.exit();

}

run();
