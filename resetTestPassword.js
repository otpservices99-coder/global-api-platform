require("dotenv").config();

const connectDB =
require("./config/database");

const User =
require("./models/User");

const bcrypt =
require("bcryptjs");


async function run(){

try{

await connectDB();


const user =
await User.findById(
"6a6bd90eed39744abd5cdcc2"
);


if(!user){

console.log("User not found");
process.exit();

}


const newPassword =
"Test@12345";


user.password =
await bcrypt.hash(
newPassword,
10
);


await user.save();


console.log("✅ Password reset");
console.log("Email: test@example.com");
console.log("Password: Test@12345");


process.exit();


}catch(error){

console.error(error);

process.exit(1);

}

}


run();
