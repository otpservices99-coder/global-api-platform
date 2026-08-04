require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Project = require("./models/Project");
const Role = require("./models/Role");

async function createSuperAdmin() {
    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ Connected to MongoDB");

        const project = await Project.findOne({
            status: "active"
        });

        if (!project) {
            console.log("❌ No active project found.");
            process.exit(1);
        }

        let role = await Role.findOne({
            project: project._id,
            name: "Admin"
        });

        if (!role) {

            console.log("⚠ Admin role not found. Creating one...");

            role = await Role.create({
                project: project._id,
                name: "Admin",
                description: "Global Administrator",
                permissions: [],
                enabled: true
            });

            console.log("✅ Admin role created");
        }

        const email = "ezechinonso717@gmail.com";

        const existingUser = await User.findOne({
            email
        });

        if (existingUser) {
            console.log("❌ User already exists.");
            process.exit(0);
        }

        // CHANGE THIS
        const plainPassword = "Super2323@";

        const hashedPassword = await bcrypt.hash(
            plainPassword,
            10
        );

        const user = await User.create({

            username: "GlobalAdmin",

            email,

            password: hashedPassword,

            project: project._id,

            role: role._id,

            platformRole: "super_admin",

            status: "active"

        });

        console.log("");
        console.log("======================================");
        console.log("✅ SUPER ADMIN CREATED");
        console.log("======================================");
        console.log("Email :", email);
        console.log("Password :", plainPassword);
        console.log("Project :", project.name);
        console.log("Role :", role.name);
        console.log("Platform :", "super_admin");
        console.log("======================================");

        process.exit(0);

    } catch (err) {

        console.error("❌", err);

        process.exit(1);

    }

}

createSuperAdmin();
