require("dotenv").config();

const bcrypt = require("bcryptjs");

const connectDB = require("./config/database");

const User = require("./models/User");


async function run(){

try{

await connectDB();


const user = await User.findById(
"6a6bd90eed39744abd5cdcc2"
);


if(!user){

console.log("User not found");

process.exit();

}


const newPassword = "Super2323@";


user.password = await bcrypt.hash(
newPassword,
10
);


user.platformRole = "super_admin";


await user.save();


console.log("✅ Password reset successfully");
console.log("New password:", newPassword);


process.exit();


}catch(error){

console.error(error);

process.exit(1);

}

}


run();
