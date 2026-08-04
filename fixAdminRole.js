require("dotenv").config();


const connectDB =
require("./config/database");


const User =
require("./models/User");



async function run(){


try{


await connectDB();



const user =
await User.findById(
"6a6bd90eed39744abd5cdcc2"
)
.select("+role");



if(!user){

console.log("User not found");

process.exit();

}



// Remove invalid string role

user.role = null;


// Set platform permission

user.platformRole =
"super_admin";


// Keep normal admin permission empty
// because platformRole controls platform access


await user.save();



console.log(
"✅ Fixed role and promoted to super_admin"
);



process.exit();



}catch(error){

console.error(error);

process.exit(1);

}


}



run();
