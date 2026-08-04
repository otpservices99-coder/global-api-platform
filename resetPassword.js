require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const email = "test@example.com";
        const newPassword = "Password123!";

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await User.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) {
            console.log("User not found");
            process.exit(0);
        }

        console.log("Password reset successfully.");
        console.log("Email:", user.email);
        console.log("New Password:", newPassword);

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetPassword();
