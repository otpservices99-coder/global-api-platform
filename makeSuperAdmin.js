require("dotenv").config();


const connectDB =
require("./config/database");


const User =
require("./models/User");



const userId =
"6a6bd90eed39744abd5cdcc2";



async function run(){


try{


await connectDB();



const user =
await User.findById(userId);



if(!user){

console.log("User not found");

process.exit();

}



user.platformRole =
"super_admin";



await user.save();



console.log(
"✅ User promoted to super_admin"
);



process.exit();



}catch(error){


console.error(error);


process.exit(1);


}


}



run();
