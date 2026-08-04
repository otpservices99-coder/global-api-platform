require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

async function run(){

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ MongoDB connected");


        const user = await User.findById(
            "6a6bd90eed39744abd5cdcc2"
        );


        if(!user){

            console.log("❌ User not found");
            process.exit();

        }


        user.role = "platform_admin";
        user.status = "active";


        await user.save();


        console.log("✅ Platform admin created successfully");

        console.log({
            id: user._id,
            email: user.email,
            role: user.role,
            status: user.status
        });


        await mongoose.disconnect();

        process.exit();


    } catch(error){

        console.log("❌ Error:", error.message);

        process.exit(1);

    }

}


run();
