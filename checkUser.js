require("dotenv").config();

const connectDB = require("./config/database");
const User = require("./models/User");

async function run(){

await connectDB();

const user = await User.findById(
"6a6bd90eed39744abd5cdcc2"
).select("-password");

console.log(JSON.stringify(user,null,2));

process.exit();

}

run();
