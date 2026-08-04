require("dotenv").config();

const connectDB = require("./config/database");
const ApiUsage = require("./models/ApiUsage");

connectDB();

setTimeout(async()=>{

try{

const usage = await ApiUsage.find({});

console.log(
JSON.stringify(usage,null,2)
);

process.exit();

}catch(error){

console.log(error.message);

process.exit();

}

},2000);
